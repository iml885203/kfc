import type { LogLine as K8sLogLine } from '../k8s/client.js'
// @vitest-environment happy-dom
import { act, waitFor } from '@testing-library/react'
import { render } from 'ink-testing-library'
import * as React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { stripAnsiCodes } from '../utils/clipboard.js'
import LogViewer from './LogViewer.js'

describe('logViewer Wrap Toggle Test', () => {
  let mockFollowLogs: ReturnType<typeof vi.fn>
  let onLogCallback: ((log: K8sLogLine) => void) | null
  let _clipboardContent: string
  let inputHandler: ((input: string, key: any) => void) | null
  let stdoutOutput: string
  let stdoutWriteCallCount: number

  const mockUseInput = (handler: (input: string, key: any) => void) => {
    inputHandler = handler
  }

  const stdoutWriter = {
    write: (text: string) => {
      stdoutWriteCallCount++
      if (text.includes('\x1Bc') || text.includes('\u001Bc')) {
        stdoutOutput = ''
        // eslint-disable-next-line no-control-regex
        text = text.replace(/\x1Bc/g, '').replace(/\u001Bc/g, '')
      }
      stdoutOutput += text
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

  const getOutput = (lastFrame: string) => {
    return stripAnsiCodes(lastFrame + stdoutOutput)
  }

  beforeEach(() => {
    vi.clearAllMocks()
    onLogCallback = null
    _clipboardContent = ''
    inputHandler = null
    stdoutOutput = ''
    stdoutWriteCallCount = 0

    mockFollowLogs = vi.fn(async (_dep, _ns, _ctx, _tail, onLog) => {
      onLogCallback = onLog
      return new Promise<void>(() => {}) // Never resolve
    })
  })

  it('should trigger re-render when pressing "w" to toggle wrap', async () => {
    const { lastFrame } = render(
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

    // Emit some logs
    await act(async () => {
      emitLog('[INFO] First log line')
      emitLog('[INFO] Second log line')
      await new Promise(resolve => setTimeout(resolve, 200))
    })

    const outputBefore = getOutput(lastFrame()!)
    expect(outputBefore).toContain('First log line')
    expect(outputBefore).toContain('Second log line')

    // Record the write count before pressing 'w'
    const writeCountBefore = stdoutWriteCallCount

    // Press 'w' to toggle wrap
    await act(async () => {
      pressKey('w', {})
      await new Promise(resolve => setTimeout(resolve, 100))
    })

    // Check that write was called (indicating re-render)
    await waitFor(() => {
      expect(stdoutWriteCallCount).toBeGreaterThan(writeCountBefore)
    }, { timeout: 2000 })

    // Verify the output still contains the logs after re-render
    const outputAfter = getOutput(lastFrame()!)
    expect(outputAfter).toContain('First log line')
    expect(outputAfter).toContain('Second log line')
  })

  it('should trigger full re-render (clear screen) when toggling wrap', async () => {
    let clearScreenCalled = false
    const customStdoutWriter = {
      write: (text: string) => {
        stdoutWriteCallCount++
        if (text.includes('\x1Bc') || text.includes('\u001Bc')) {
          clearScreenCalled = true
          stdoutOutput = ''
          // eslint-disable-next-line no-control-regex
          text = text.replace(/\x1Bc/g, '').replace(/\u001Bc/g, '')
        }
        stdoutOutput += text
      },
    }

    const { lastFrame } = render(
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
        stdoutWriter={customStdoutWriter}
      />,
    )

    // Emit multiple logs
    await act(async () => {
      emitLog('[INFO] Log line 1')
      emitLog('[WARN] Log line 2')
      emitLog('[ERROR] Log line 3')
      await new Promise(resolve => setTimeout(resolve, 200))
    })

    const writeCountBefore = stdoutWriteCallCount
    clearScreenCalled = false

    // Press 'w' to toggle wrap
    await act(async () => {
      pressKey('w', {})
      await new Promise(resolve => setTimeout(resolve, 100))
    })

    // Should trigger full re-render (clear screen + redraw)
    await waitFor(() => {
      expect(stdoutWriteCallCount).toBeGreaterThan(writeCountBefore)
      // Verify that clear screen was called (indicating full re-render)
      expect(clearScreenCalled).toBe(true)
      const output = getOutput(lastFrame()!)
      // All logs should be present after re-render
      expect(output).toContain('Log line 1')
      expect(output).toContain('Log line 2')
      expect(output).toContain('Log line 3')
    }, { timeout: 2000 })
  })

  it('should toggle wrap state back and forth', async () => {
    const { lastFrame } = render(
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

    // Emit logs
    await act(async () => {
      emitLog('[INFO] Test log')
      await new Promise(resolve => setTimeout(resolve, 200))
    })

    const initialWriteCount = stdoutWriteCallCount

    // Toggle wrap on
    await act(async () => {
      pressKey('w', {})
      await new Promise(resolve => setTimeout(resolve, 100))
    })

    const afterFirstToggle = stdoutWriteCallCount
    expect(afterFirstToggle).toBeGreaterThan(initialWriteCount)

    // Toggle wrap off
    await act(async () => {
      pressKey('w', {})
      await new Promise(resolve => setTimeout(resolve, 100))
    })

    const afterSecondToggle = stdoutWriteCallCount
    expect(afterSecondToggle).toBeGreaterThan(afterFirstToggle)

    // Verify logs are still visible
    const output = getOutput(lastFrame()!)
    expect(output).toContain('Test log')
  })
})
