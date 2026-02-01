// @vitest-environment happy-dom
import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useLogStream } from './useLogStream.js'

describe('useLogStream', () => {
  const mockFollowLogs = vi.fn()
  const mockAddLine = vi.fn()
  const mockAddErrorLogLine = vi.fn()

  const defaultProps = {
    deployment: 'test-deployment',
    namespace: 'test-namespace',
    context: 'test-context',
    tail: 100,
    maxRetry: 3,
    timeout: 5,
    paused: false,
    followLogs: mockFollowLogs,
    addLine: mockAddLine,
    addErrorLogLine: mockAddErrorLogLine,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should start connecting on mount', async () => {
    mockFollowLogs.mockImplementation(() => new Promise(() => {})) // Pending promise

    const { result } = renderHook(() => useLogStream(defaultProps))

    expect(result.current.status).toContain('Connecting to test-deployment')
    expect(result.current.isConnected).toBe(false)
    expect(mockFollowLogs).toHaveBeenCalledWith(
      'test-deployment',
      'test-namespace',
      'test-context',
      100,
      expect.any(Function), // onLog
      expect.any(Function), // onError
      expect.any(Function), // onProgress
      5000, // timeout in ms
    )
  })

  it('should set isConnected to true when first log is received', async () => {
    mockFollowLogs.mockImplementation((_dep, _ns, _ctx, _tail, onLog) => {
      // Simulate a log line immediately
      onLog({ line: 'test log', pod: 'pod-1', container: 'container-1' })
      return Promise.resolve()
    })

    const { result } = renderHook(() => useLogStream(defaultProps))

    // Wait for the state update
    await waitFor(() => {
      expect(result.current.isConnected).toBe(true)
    })
    expect(result.current.status).toContain('Following logs')
    expect(mockAddLine).toHaveBeenCalled()
  })

  it('should retry on connection failure', async () => {
    // Mock followLogs to call onError immediately
    mockFollowLogs.mockImplementation((_dep, _ns, _ctx, _tail, _onLog, onError) => {
      onError(new Error('Connection failed'))
      return Promise.resolve()
    })
    vi.useFakeTimers()

    const { result } = renderHook(() => useLogStream(defaultProps))

    // Initial failure
    await waitFor(() => {
      expect(result.current.status).toContain('Connection lost')
    })

    // Advance timers to trigger retry
    act(() => {
      vi.advanceTimersByTime(2000)
    })

    await waitFor(() => {
      expect(mockFollowLogs).toHaveBeenCalledTimes(2)
    }, { timeout: 3000 })
  })

  it('should not process logs when paused', async () => {
    mockFollowLogs.mockImplementation((_dep, _ns, _ctx, _tail, onLog) => {
      // Simulate a log line
      onLog({ line: 'test log', pod: 'pod-1', container: 'container-1' })
      return Promise.resolve()
    })

    renderHook(() => useLogStream({ ...defaultProps, paused: true }))

    // Allow any async effects to run
    await act(async () => {
      await Promise.resolve()
    })

    expect(mockAddLine).not.toHaveBeenCalled()
  })
})
