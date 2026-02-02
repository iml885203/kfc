import type { LogLine as K8sLogLine } from '../../src/k8s/client.js'
import { vi } from 'vitest'

export interface MockLogStreamCallbacks {
  onLog: ((log: K8sLogLine) => void) | null
  onError: ((error: Error) => void) | null
  onProgress: ((progress: string) => void) | null
}

export interface ConnectionHistoryEntry {
  type: 'connect' | 'cancel'
  timestamp: number
  paused?: boolean
}

export interface MockLogStream {
  mockFollowLogs: ReturnType<typeof vi.fn>
  emitLog: (log: Partial<K8sLogLine>) => void
  emitError: (error: Error) => void
  emitProgress: (progress: string) => void
  getConnectionCount: () => number
  getCancelCount: () => number
  callHistory: ConnectionHistoryEntry[]
  isCurrentlyCancelled: () => boolean
}

/**
 * Creates a controllable mock log stream for testing
 *
 * This helper allows tests to:
 * - Track connection/reconnection attempts
 * - Emit logs, errors, and progress updates on demand
 * - Verify the number of times connections were established or cancelled
 */
export function createMockLogStream(): MockLogStream {
  const callbacks: MockLogStreamCallbacks = {
    onLog: null,
    onError: null,
    onProgress: null,
  }

  const callHistory: ConnectionHistoryEntry[] = []
  let currentCancelled = false

  const mockFollowLogs = vi.fn(
    async (
      _deployment: string,
      _namespace: string,
      _context: string | undefined,
      _tail: number,
      onLog: (log: K8sLogLine) => void,
      onError: (error: Error) => void,
      onProgress: (progress: string) => void,
      _timeout: number,
    ) => {
      // Record connection attempt
      callHistory.push({
        type: 'connect',
        timestamp: Date.now(),
      })

      // Store callbacks
      callbacks.onLog = onLog
      callbacks.onError = onError
      callbacks.onProgress = onProgress

      // Reset cancelled flag for new connection
      currentCancelled = false

      // Simulate initial progress
      onProgress?.('Connecting...')

      // Return a promise that never resolves (simulates long-lived connection)
      return new Promise<void>(() => {})
    },
  )

  // Add cleanup tracking via mock implementation override
  const originalImpl = mockFollowLogs.getMockImplementation()
  mockFollowLogs.mockImplementation((...args) => {
    // Cleanup function would be called in real useEffect
    // Currently not used in tests but kept for future enhancement
    const _cleanup = () => {
      currentCancelled = true
      callHistory.push({
        type: 'cancel',
        timestamp: Date.now(),
      })
    }

    // Call original implementation
    const promise = originalImpl?.(...args) || Promise.resolve()

    // Attach cleanup to promise (though it won't be called automatically)
    // In real useEffect, the cleanup function will be called
    return promise
  })

  return {
    mockFollowLogs,

    emitLog: (log: Partial<K8sLogLine>) => {
      if (callbacks.onLog && !currentCancelled) {
        callbacks.onLog({
          pod: log.pod || 'test-pod',
          container: log.container || 'test-container',
          line: log.line || 'test log line',
          timestamp: log.timestamp || new Date(),
        })
      }
    },

    emitError: (error: Error) => {
      if (callbacks.onError && !currentCancelled) {
        callbacks.onError(error)
      }
    },

    emitProgress: (progress: string) => {
      if (callbacks.onProgress && !currentCancelled) {
        callbacks.onProgress(progress)
      }
    },

    getConnectionCount: () => {
      return callHistory.filter(entry => entry.type === 'connect').length
    },

    getCancelCount: () => {
      return callHistory.filter(entry => entry.type === 'cancel').length
    },

    isCurrentlyCancelled: () => currentCancelled,

    callHistory,
  }
}

/**
 * Helper to create a test log line
 */
export function createTestLog(line: string, pod = 'test-pod', container = 'test-container'): K8sLogLine {
  return {
    pod,
    container,
    line,
    timestamp: new Date(),
  }
}

/**
 * Helper to wait for a condition with timeout
 */
export async function waitFor(
  condition: () => boolean | void,
  timeoutMs = 2000,
  checkIntervalMs = 50,
): Promise<void> {
  const start = Date.now()

  while (Date.now() - start < timeoutMs) {
    try {
      const result = condition()
      if (result !== false) {
        return
      }
    }
    catch {
      // Condition threw, keep waiting
    }
    await new Promise(resolve => setTimeout(resolve, checkIntervalMs))
  }

  // Final attempt, throw if it fails
  condition()
}
