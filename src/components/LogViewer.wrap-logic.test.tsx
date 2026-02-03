import type { LogLine as K8sLogLine } from '../k8s/client.js'
// @vitest-environment happy-dom
import { act, waitFor } from '@testing-library/react'
import { render } from 'ink-testing-library'
import * as React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { stripAnsiCodes } from '../utils/clipboard.js'
import LogViewer from './LogViewer.js'

describe('logViewer Wrap/NoWrap Toggle Logic Test', () => {
  let mockFollowLogs: ReturnType<typeof vi.fn>
  let onLogCallback: ((log: K8sLogLine) => void) | null
  let _clipboardContent: string
  let inputHandler: ((input: string, key: any) => void) | null

  // Mock terminal state
  let terminalState = {
    wrapEnabled: true, // Default terminal state is usually wrap enabled
    lastWrite: '',
  }

  const mockUseInput = (handler: (input: string, key: any) => void) => {
    inputHandler = handler
  }

  const stdoutWriter = {
    write: (text: string) => {
      // Logic to simulate terminal behavior

      // Check for Enable Wrap
      if (text.includes('\x1B[?7h')) {
        terminalState.wrapEnabled = true
      }

      // Check for Disable Wrap
      if (text.includes('\x1B[?7l')) {
        terminalState.wrapEnabled = false
      }

      // Check for RIS (Reset to Initial State)
      if (text.includes('\x1Bc') || text.includes('\u001Bc')) {
        // RIS resets everything to default, including wrap enabled
        terminalState.wrapEnabled = true
      }

      terminalState.lastWrite = text
    },
  }

  const emitLog = (line: string, pod = 'test-pod', container = 'test-container') => {
    if (onLogCallback) {
      onLogCallback({
        pod,
        container,
        line,
        timestamp: new Date(),
      })
    }
  }

  const pressKey = (key: string, keyObj: any = {}) => {
    if (!inputHandler) {
      throw new Error('Input handler not initialized')
    }
    inputHandler(key, {
      return: false,
      escape: false,
      ctrl: false,
      meta: false,
      shift: false,
      delete: false,
      backspace: false,
      ...keyObj,
    })
  }

  beforeEach(() => {
    vi.clearAllMocks()
    onLogCallback = null
    _clipboardContent = ''
    inputHandler = null
    terminalState = {
      wrapEnabled: true,
      lastWrite: '',
    }

    mockFollowLogs = vi.fn(async (_dep, _ns, _ctx, _tail, onLog) => {
      onLogCallback = onLog
      return new Promise<void>(() => {}) // Never resolve
    })
  })

  it('should maintain NoWrap state after re-render when switching to NoWrap', async () => {
    render(
      <LogViewer
        deployment="my-api"
        namespace="default"
        tail={100}
        maxRetry={0}
        timeout={5}
        followLogs={mockFollowLogs as any}
        copyToClipboard={async (text) => {
          _clipboardContent = text
          return true
        }}
        useInputHook={mockUseInput as any}
        stdoutWriter={stdoutWriter}
      />,
    )

    // Initial state
    expect(terminalState.wrapEnabled).toBe(true)

    // Emit logs
    await act(async () => {
      emitLog('[INFO] Test log')
      await new Promise(resolve => setTimeout(resolve, 100))
    })

    // Press 'w' to toggle wrap (Default True -> False)
    await act(async () => {
      pressKey('w', {})
      await new Promise(resolve => setTimeout(resolve, 100))
    })

    await waitFor(() => {
      // This is expected to fail if the bug exists (Reset overrides Disable Wrap)
      expect(terminalState.wrapEnabled).toBe(false)
    })
  })
})
