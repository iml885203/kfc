// @vitest-environment happy-dom
import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createMockLogStream, createTestLog } from '../../test/helpers/mockLogStream.js'
import { useLogStream } from './useLogStream.js'

describe('useLogStream - Pause Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('pause should NOT trigger reconnection', () => {
    it('should not reconnect when paused changes from false to true', async () => {
      const mockStream = createMockLogStream()
      const addLine = vi.fn()
      const addErrorLogLine = vi.fn()

      // Initial render with paused = false
      const { rerender } = renderHook(
        ({ paused }) =>
          useLogStream({
            deployment: 'test-deployment',
            namespace: 'default',
            context: undefined,
            tail: 100,
            maxRetry: 3,
            timeout: 30,
            paused,
            followLogs: mockStream.mockFollowLogs as any,
            addLine,
            addErrorLogLine,
          }),
        {
          initialProps: { paused: false },
        },
      )

      // Wait for initial connection
      await waitFor(() => {
        expect(mockStream.getConnectionCount()).toBe(1)
      })

      // Emit some logs to verify connection is working
      act(() => {
        mockStream.emitLog(createTestLog('[INFO] Log 1'))
        mockStream.emitLog(createTestLog('[INFO] Log 2'))
      })

      await waitFor(() => {
        expect(addLine).toHaveBeenCalledTimes(2)
      })

      const initialConnectionCount = mockStream.getConnectionCount()
      const initialAddLineCallCount = addLine.mock.calls.length

      // ACTION: Change paused to true
      act(() => {
        rerender({ paused: true })
      })

      // Wait a bit to ensure effect doesn't re-run
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 200))
      })

      // ASSERTION: followLogs should NOT be called again
      expect(mockStream.getConnectionCount()).toBe(initialConnectionCount)
      expect(mockStream.mockFollowLogs).toHaveBeenCalledTimes(1)

      // Emit more logs - they should be ignored when paused
      act(() => {
        mockStream.emitLog(createTestLog('[INFO] Log 3 - should be ignored'))
      })

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100))
      })

      // Logs should not be added while paused
      expect(addLine).toHaveBeenCalledTimes(initialAddLineCallCount)
    })

    it('should not reconnect when paused changes from true to false', async () => {
      const mockStream = createMockLogStream()
      const addLine = vi.fn()
      const addErrorLogLine = vi.fn()

      // Initial render with paused = true
      const { rerender } = renderHook(
        ({ paused }) =>
          useLogStream({
            deployment: 'test-deployment',
            namespace: 'default',
            context: undefined,
            tail: 100,
            maxRetry: 3,
            timeout: 30,
            paused,
            followLogs: mockStream.mockFollowLogs as any,
            addLine,
            addErrorLogLine,
          }),
        {
          initialProps: { paused: true },
        },
      )

      // Wait for initial connection
      await waitFor(() => {
        expect(mockStream.getConnectionCount()).toBe(1)
      })

      const initialConnectionCount = mockStream.getConnectionCount()

      // ACTION: Change paused to false (resume)
      rerender({ paused: false })

      // Wait a bit to ensure effect doesn't re-run
      await new Promise(resolve => setTimeout(resolve, 200))

      // ASSERTION: followLogs should NOT be called again
      expect(mockStream.getConnectionCount()).toBe(initialConnectionCount)
      expect(mockStream.mockFollowLogs).toHaveBeenCalledTimes(1)

      // Now logs should be processed again
      mockStream.emitLog(createTestLog('[INFO] Log after resume'))

      await waitFor(() => {
        expect(addLine).toHaveBeenCalledTimes(1)
      })
    })

    it('should not reconnect when toggling pause multiple times', async () => {
      const mockStream = createMockLogStream()
      const addLine = vi.fn()
      const addErrorLogLine = vi.fn()

      const { rerender } = renderHook(
        ({ paused }) =>
          useLogStream({
            deployment: 'test-deployment',
            namespace: 'default',
            context: undefined,
            tail: 100,
            maxRetry: 3,
            timeout: 30,
            paused,
            followLogs: mockStream.mockFollowLogs as any,
            addLine,
            addErrorLogLine,
          }),
        {
          initialProps: { paused: false },
        },
      )

      // Wait for initial connection
      await waitFor(() => {
        expect(mockStream.getConnectionCount()).toBe(1)
      })

      // Toggle pause 5 times rapidly
      for (let i = 0; i < 5; i++) {
        rerender({ paused: true })
        await new Promise(resolve => setTimeout(resolve, 50))
        rerender({ paused: false })
        await new Promise(resolve => setTimeout(resolve, 50))
      }

      // ASSERTION: Should still only have 1 connection
      expect(mockStream.getConnectionCount()).toBe(1)
      expect(mockStream.mockFollowLogs).toHaveBeenCalledTimes(1)
    })
  })

  describe('pause should control log processing', () => {
    it('should stop processing logs when paused', async () => {
      const mockStream = createMockLogStream()
      const addLine = vi.fn()
      const addErrorLogLine = vi.fn()

      const { rerender } = renderHook(
        ({ paused }) =>
          useLogStream({
            deployment: 'test-deployment',
            namespace: 'default',
            context: undefined,
            tail: 100,
            maxRetry: 3,
            timeout: 30,
            paused,
            followLogs: mockStream.mockFollowLogs as any,
            addLine,
            addErrorLogLine,
          }),
        {
          initialProps: { paused: false },
        },
      )

      await waitFor(() => {
        expect(mockStream.getConnectionCount()).toBe(1)
      })

      // Process some logs
      mockStream.emitLog(createTestLog('[INFO] Log 1'))
      mockStream.emitLog(createTestLog('[INFO] Log 2'))

      await waitFor(() => {
        expect(addLine).toHaveBeenCalledTimes(2)
      })

      const callCountBeforePause = addLine.mock.calls.length

      // Pause
      rerender({ paused: true })
      await new Promise(resolve => setTimeout(resolve, 100))

      // Emit logs while paused
      mockStream.emitLog(createTestLog('[INFO] Log 3 - paused'))
      mockStream.emitLog(createTestLog('[INFO] Log 4 - paused'))

      await new Promise(resolve => setTimeout(resolve, 100))

      // Should not process logs while paused
      expect(addLine).toHaveBeenCalledTimes(callCountBeforePause)
    })

    it('should resume processing logs when unpaused', async () => {
      const mockStream = createMockLogStream()
      const addLine = vi.fn()
      const addErrorLogLine = vi.fn()

      const { rerender } = renderHook(
        ({ paused }) =>
          useLogStream({
            deployment: 'test-deployment',
            namespace: 'default',
            context: undefined,
            tail: 100,
            maxRetry: 3,
            timeout: 30,
            paused,
            followLogs: mockStream.mockFollowLogs as any,
            addLine,
            addErrorLogLine,
          }),
        {
          initialProps: { paused: true },
        },
      )

      await waitFor(() => {
        expect(mockStream.getConnectionCount()).toBe(1)
      })

      // Emit log while paused - should be ignored
      mockStream.emitLog(createTestLog('[INFO] Log 1 - paused'))
      await new Promise(resolve => setTimeout(resolve, 100))
      expect(addLine).not.toHaveBeenCalled()

      // Resume
      rerender({ paused: false })
      await new Promise(resolve => setTimeout(resolve, 100))

      // Emit log after resume - should be processed
      mockStream.emitLog(createTestLog('[INFO] Log 2 - resumed'))

      await waitFor(() => {
        expect(addLine).toHaveBeenCalledTimes(1)
      })

      // Verify the log content
      expect(addLine.mock.calls[0][0]).toMatchObject({
        line: '[INFO] Log 2 - resumed',
      })
    })
  })

  describe('connection stability', () => {
    it('should maintain connection state across pause/resume cycles', async () => {
      const mockStream = createMockLogStream()
      const addLine = vi.fn()
      const addErrorLogLine = vi.fn()

      const { result, rerender } = renderHook(
        ({ paused }) =>
          useLogStream({
            deployment: 'test-deployment',
            namespace: 'default',
            context: undefined,
            tail: 100,
            maxRetry: 3,
            timeout: 30,
            paused,
            followLogs: mockStream.mockFollowLogs as any,
            addLine,
            addErrorLogLine,
          }),
        {
          initialProps: { paused: false },
        },
      )

      // Wait for connection
      await waitFor(() => {
        expect(result.current.isConnected).toBe(false) // Still connecting
      })

      // Emit first log to trigger connected state
      mockStream.emitLog(createTestLog('[INFO] First log'))

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true)
      })

      const connectedStatus = result.current.isConnected

      // Pause
      rerender({ paused: true })
      await new Promise(resolve => setTimeout(resolve, 100))

      // Connection should still be marked as connected
      expect(result.current.isConnected).toBe(connectedStatus)

      // Resume
      rerender({ paused: false })
      await new Promise(resolve => setTimeout(resolve, 100))

      // Connection should still be connected
      expect(result.current.isConnected).toBe(true)
      expect(mockStream.getConnectionCount()).toBe(1)
    })
  })
})
