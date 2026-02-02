import { act } from '@testing-library/react'
// @vitest-environment happy-dom
import { render } from 'ink-testing-library'
import * as React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createMockLogStream, waitFor } from '../../test/helpers/mockLogStream.js'
import { stripAnsiCodes } from '../utils/clipboard.js'
import LogViewer from './LogViewer.js'

describe('logViewer - Display Update Tests', () => {
  let mockStream: ReturnType<typeof createMockLogStream>
  let pressKey: (input: string, key: any) => void
  let stdoutOutput: string

  const stdoutWriter = {
    write: (text: string) => {
      if (text.includes('\x1Bc') || text.includes('\u001Bc')) {
        stdoutOutput = ''
        // eslint-disable-next-line no-control-regex
        text = text.replace(/\x1Bc/g, '').replace(/\u001Bc/g, '')
      }
      stdoutOutput += text
    },
  }

  const getOutput = (lastFrame: string) => {
    return stripAnsiCodes(lastFrame + stdoutOutput)
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockStream = createMockLogStream()
    stdoutOutput = ''
  })

  const createTestProps = () => ({
    deployment: 'test-deployment',
    namespace: 'default',
    context: undefined,
    tail: 100,
    maxRetry: 3,
    timeout: 30,
    followLogs: mockStream.mockFollowLogs as any,
    useInputHook: (inputHandler: any) => {
      pressKey = inputHandler
    },
    stdoutWriter,
  })

  describe('help mode should NOT prevent log accumulation', () => {
    it('should accumulate logs while help is displayed and show them when help is closed', async () => {
      const props = createTestProps()
      const { lastFrame } = render(<LogViewer {...props} />)

      // Wait for connection
      await waitFor(() => {
        expect(mockStream.getConnectionCount()).toBe(1)
      })

      // Emit first log to trigger connected state
      await act(async () => {
        mockStream.emitLog({ line: '[INFO] Initial log' })
        await new Promise(resolve => setTimeout(resolve, 100))
      })

      await waitFor(() => {
        const output = getOutput(lastFrame()!)
        expect(output).toContain('Initial log')
      })

      // Open help by pressing '?'
      act(() => {
        pressKey('?', {})
      })

      await new Promise(resolve => setTimeout(resolve, 100))

      // Check help is displayed (use lastFrame only, as help is React component)
      await waitFor(() => {
        const frame = lastFrame()!
        expect(frame).toContain('KFC')
        expect(frame).toContain('Press any key to return')
      })

      // CRITICAL: Emit logs while help is displayed
      await act(async () => {
        mockStream.emitLog({ line: '[INFO] Log during help 1' })
        mockStream.emitLog({ line: '[INFO] Log during help 2' })
        mockStream.emitLog({ line: '[INFO] Log during help 3' })
        await new Promise(resolve => setTimeout(resolve, 100))
      })

      // Close help (any key press)
      act(() => {
        pressKey('q', {})
      })

      await new Promise(resolve => setTimeout(resolve, 100))

      // CRITICAL ASSERTION: All logs accumulated during help should now be visible
      await waitFor(() => {
        const output = getOutput(lastFrame()!)
        expect(output).toContain('Log during help 1')
        expect(output).toContain('Log during help 2')
        expect(output).toContain('Log during help 3')
      })
    })

    it('should show real-time updates IMMEDIATELY when help is not displayed', async () => {
      const props = createTestProps()
      const { lastFrame } = render(<LogViewer {...props} />)

      await waitFor(() => {
        expect(mockStream.getConnectionCount()).toBe(1)
      })

      // Emit initial log
      await act(async () => {
        mockStream.emitLog({ line: '[INFO] First log' })
        await new Promise(resolve => setTimeout(resolve, 100))
      })

      await waitFor(() => {
        const output = getOutput(lastFrame()!)
        expect(output).toContain('First log')
      })

      // Emit second log - should appear immediately without any user action
      await act(async () => {
        mockStream.emitLog({ line: '[INFO] Second log - should appear immediately' })
        await new Promise(resolve => setTimeout(resolve, 100))
      })

      // CRITICAL: Should be visible immediately without pressing help or any other key
      await waitFor(() => {
        const output = getOutput(lastFrame()!)
        expect(output).toContain('Second log - should appear immediately')
      })
    })
  })

  describe('buffer clear should update display IMMEDIATELY', () => {
    it('should clear display immediately when pressing x without needing to toggle help', async () => {
      const props = createTestProps()
      const { lastFrame } = render(<LogViewer {...props} />)

      await waitFor(() => {
        expect(mockStream.getConnectionCount()).toBe(1)
      })

      // Emit some logs
      await act(async () => {
        mockStream.emitLog({ line: '[INFO] Log 1' })
        mockStream.emitLog({ line: '[INFO] Log 2' })
        mockStream.emitLog({ line: '[INFO] Log 3' })
        await new Promise(resolve => setTimeout(resolve, 200))
      })

      await waitFor(() => {
        const output = getOutput(lastFrame()!)
        expect(output).toContain('Log 1')
        expect(output).toContain('Log 2')
        expect(output).toContain('Log 3')
      })

      // Press 'x' to clear logs
      act(() => {
        pressKey('x', {})
      })

      await new Promise(resolve => setTimeout(resolve, 100))

      // CRITICAL ASSERTION: Display should be cleared IMMEDIATELY
      // without needing to press '?' or any other key
      await waitFor(() => {
        const output = getOutput(lastFrame()!)
        expect(output).not.toContain('Log 1')
        expect(output).not.toContain('Log 2')
        expect(output).not.toContain('Log 3')
      })
    })

    it('should clear display immediately when pressing Ctrl+L', async () => {
      const props = createTestProps()
      const { lastFrame } = render(<LogViewer {...props} />)

      await waitFor(() => {
        expect(mockStream.getConnectionCount()).toBe(1)
      })

      // Emit some logs
      await act(async () => {
        mockStream.emitLog({ line: '[INFO] Log A' })
        mockStream.emitLog({ line: '[INFO] Log B' })
        await new Promise(resolve => setTimeout(resolve, 200))
      })

      await waitFor(() => {
        const output = getOutput(lastFrame()!)
        expect(output).toContain('Log A')
        expect(output).toContain('Log B')
      })

      // Press Ctrl+L to clear logs
      act(() => {
        pressKey('l', { ctrl: true })
      })

      await new Promise(resolve => setTimeout(resolve, 100))

      // CRITICAL: Should clear immediately
      await waitFor(() => {
        const output = getOutput(lastFrame()!)
        expect(output).not.toContain('Log A')
        expect(output).not.toContain('Log B')
      })
    })
  })

  describe('combined scenarios', () => {
    it('should handle: logs accumulate during help, then clear, then new logs appear', async () => {
      const props = createTestProps()
      const { lastFrame } = render(<LogViewer {...props} />)

      await waitFor(() => {
        expect(mockStream.getConnectionCount()).toBe(1)
      })

      // Initial logs
      await act(async () => {
        mockStream.emitLog({ line: '[INFO] Before help' })
        await new Promise(resolve => setTimeout(resolve, 100))
      })

      await waitFor(() => {
        const output = getOutput(lastFrame()!)
        expect(output).toContain('Before help')
      })

      // Open help
      act(() => {
        pressKey('?', {})
      })

      // Emit logs during help
      await act(async () => {
        mockStream.emitLog({ line: '[INFO] During help' })
        await new Promise(resolve => setTimeout(resolve, 100))
      })

      // Close help
      act(() => {
        pressKey('q', {})
      })

      await new Promise(resolve => setTimeout(resolve, 100))

      // Should see accumulated logs
      await waitFor(() => {
        const output = getOutput(lastFrame()!)
        expect(output).toContain('Before help')
        expect(output).toContain('During help')
      })

      // Clear logs
      act(() => {
        pressKey('x', {})
      })

      await new Promise(resolve => setTimeout(resolve, 100))

      // Should be cleared immediately
      await waitFor(() => {
        const output = getOutput(lastFrame()!)
        expect(output).not.toContain('Before help')
        expect(output).not.toContain('During help')
      })

      // Add new logs
      await act(async () => {
        mockStream.emitLog({ line: '[INFO] After clear' })
        await new Promise(resolve => setTimeout(resolve, 100))
      })

      // Should appear immediately
      await waitFor(() => {
        const output = getOutput(lastFrame()!)
        expect(output).toContain('After clear')
      })
    })
  })
})
