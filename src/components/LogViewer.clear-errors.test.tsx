import type { LogLine as K8sLogLine } from '../k8s/client.js'
// @vitest-environment happy-dom
import { act, waitFor } from '@testing-library/react'
import { render } from 'ink-testing-library'
import * as React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { stripAnsiCodes } from '../utils/clipboard.js'
import LogViewer from './LogViewer.js'

describe('logViewer Clear Errors Test', () => {
  let mockFollowLogs: ReturnType<typeof vi.fn>
  let onLogCallback: ((log: K8sLogLine) => void) | null
  let _clipboardContent: string
  let inputHandler: ((input: string, key: any) => void) | null
  let stdoutOutput: string

  const mockUseInput = (handler: (input: string, key: any) => void) => {
    inputHandler = handler
  }

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

    mockFollowLogs = vi.fn(async (_dep, _ns, _ctx, _tail, onLog) => {
      onLogCallback = onLog
      return new Promise<void>(() => {}) // Never resolve
    })
  })

  it('should clear errors when pressing "x"', async () => {
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

    // Emit logs with errors
    await act(async () => {
      emitLog('[INFO] Application started')
      emitLog('[ERROR] Database connection failed')
      emitLog('[INFO] Retrying connection')
      emitLog('[FATAL] System crash imminent')
      await new Promise(resolve => setTimeout(resolve, 200))
    })

    // Verify errors are collected
    let output = getOutput(lastFrame()!)
    expect(output).toMatch(/🔴\s+2\s+ERROR/i) // Should show 2 errors with emoji

    // Clear buffer with 'x'
    act(() => {
      pressKey('x', {})
    })

    await waitFor(() => {
      output = getOutput(lastFrame()!)
      // After clearing, error count badge should not be displayed
      expect(output).not.toMatch(/🔴\s+\d+\s+ERROR/i)
    })
  })

  it('should clear errors when pressing Ctrl+L', async () => {
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

    // Emit logs with errors
    await act(async () => {
      emitLog('[INFO] Starting up...')
      emitLog('[ERROR] Configuration error')
      emitLog('[WARN] Low memory warning')
      emitLog('[ERROR] Network timeout')
      await new Promise(resolve => setTimeout(resolve, 200))
    })

    // Verify errors are collected
    let output = getOutput(lastFrame()!)
    expect(output).toMatch(/🔴\s+2\s+ERROR/i) // Should show 2 errors with emoji

    // Clear buffer with Ctrl+L
    act(() => {
      pressKey('l', { ctrl: true })
    })

    await waitFor(() => {
      output = getOutput(lastFrame()!)
      // After clearing, error count badge should not be displayed
      expect(output).not.toMatch(/🔴\s+\d+\s+ERROR/i)
    })
  })

  it('should clear errors in error mode when pressing "x"', async () => {
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

    // Emit logs with errors
    await act(async () => {
      emitLog('[INFO] Application started')
      emitLog('[ERROR] Database connection failed')
      emitLog('[FATAL] System crash imminent')
      await new Promise(resolve => setTimeout(resolve, 200))
    })

    // Enter error mode
    act(() => {
      pressKey('e', {})
    })

    await waitFor(() => {
      const output = getOutput(lastFrame()!)
      expect(output).toContain('error')
    })

    // Exit error mode
    act(() => {
      pressKey('q', {})
    })

    await new Promise(resolve => setTimeout(resolve, 100))

    // Clear buffer with 'x'
    act(() => {
      pressKey('x', {})
    })

    await waitFor(() => {
      const output = getOutput(lastFrame()!)
      // After clearing, error count should be 0
      expect(output).toMatch(/0\s+ERROR/i)
    })
  })
})
