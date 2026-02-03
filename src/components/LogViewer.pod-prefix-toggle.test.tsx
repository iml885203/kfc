import type { LogLine as K8sLogLine } from '../k8s/client.js'
// @vitest-environment happy-dom
import { act, waitFor } from '@testing-library/react'
import { render } from 'ink-testing-library'
import * as React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { stripAnsiCodes } from '../utils/clipboard.js'
import LogViewer from './LogViewer.js'

describe('logViewer Pod Prefix Toggle Test', () => {
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

  it('should hide pod prefix by default', async () => {
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
      emitLog('[INFO] Application started', 'my-pod', 'my-container')
      emitLog('[ERROR] Database connection failed', 'my-pod', 'my-container')
      await new Promise(resolve => setTimeout(resolve, 200))
    })

    const output = getOutput(lastFrame()!)
    // Should NOT contain pod prefix by default
    expect(output).not.toContain('[my-pod/my-container]')
    // But should contain the log content
    expect(output).toContain('Application started')
    expect(output).toContain('Database connection failed')
  })

  it('should show pod prefix when pressing "d" to toggle', async () => {
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
      emitLog('[INFO] Application started', 'my-pod', 'my-container')
      await new Promise(resolve => setTimeout(resolve, 200))
    })

    let output = getOutput(lastFrame()!)
    expect(output).not.toContain('[my-pod/my-container]')

    // Press 'd' to toggle pod prefix display
    act(() => {
      pressKey('d', {})
    })

    await waitFor(() => {
      output = getOutput(lastFrame()!)
      // Should now show pod prefix
      expect(output).toContain('[my-pod/my-container]')
      expect(output).toContain('Application started')
    })
  })

  it('should toggle pod prefix on and off', async () => {
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
      emitLog('[INFO] Test log', 'test-pod', 'test-container')
      await new Promise(resolve => setTimeout(resolve, 200))
    })

    // Initially hidden
    let output = getOutput(lastFrame()!)
    expect(output).not.toContain('[test-pod/test-container]')

    // Toggle on
    act(() => {
      pressKey('d', {})
    })

    await waitFor(() => {
      output = getOutput(lastFrame()!)
      expect(output).toContain('[test-pod/test-container]')
    })

    // Toggle off again
    act(() => {
      pressKey('d', {})
    })

    await waitFor(() => {
      output = getOutput(lastFrame()!)
      expect(output).not.toContain('[test-pod/test-container]')
    })
  })
})
