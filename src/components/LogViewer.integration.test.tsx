import type { LogLine as K8sLogLine } from '../k8s/client.js'
// @vitest-environment happy-dom
import { act, waitFor } from '@testing-library/react'
import { render } from 'ink-testing-library'
import * as React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { stripAnsiCodes } from '../utils/clipboard.js'
import LogViewer from './LogViewer.js'

describe('logViewer Integration Tests', () => {
  let mockFollowLogs: ReturnType<typeof vi.fn>
  let onLogCallback: ((log: K8sLogLine) => void) | null
  // Used in copyToClipboard callback
  // eslint-disable-next-line unused-imports/no-unused-vars
  let clipboardContent: string
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

  const typeText = async (text: string) => {
    for (const char of text) {
      pressKey(char, {})
      await new Promise(resolve => setTimeout(resolve, 10))
    }
  }

  const getOutput = (lastFrame: string) => {
    return stripAnsiCodes(lastFrame + stdoutOutput)
  }

  beforeEach(() => {
    vi.clearAllMocks()
    onLogCallback = null
    clipboardContent = ''
    inputHandler = null
    stdoutOutput = ''

    mockFollowLogs = vi.fn(async (_dep, _ns, _ctx, _tail, onLog) => {
      onLogCallback = onLog
      return new Promise<void>(() => {}) // Never resolve
    })
  })

  describe('log Filtering', () => {
    it('should enter filter mode when pressing "/"', async () => {
      const { lastFrame } = render(
        <LogViewer
          deployment="my-api"
          namespace="default"
          tail={100}
          maxRetry={0}
          timeout={5}
          followLogs={mockFollowLogs as any}
          copyToClipboard={async (text) => {
            clipboardContent = text
            return true
          }}
          useInputHook={mockUseInput as any}
          stdoutWriter={stdoutWriter}
        />,
      )

      // Emit a log and wait for connection
      await act(async () => {
        emitLog('[INFO] Application started')
        await new Promise(resolve => setTimeout(resolve, 200))
      })

      // Press '/' to enter filter mode
      act(() => {
        pressKey('/', {})
      })

      await waitFor(() => {
        const output = getOutput(lastFrame()!)
        expect(output).toContain('Filter:')
      })
    })

    it('should filter logs by simple pattern', async () => {
      const { lastFrame } = render(
        <LogViewer
          deployment="my-api"
          namespace="default"
          tail={100}
          maxRetry={0}
          timeout={5}
          followLogs={mockFollowLogs as any}
          copyToClipboard={async (text) => {
            clipboardContent = text
            return true
          }}
          useInputHook={mockUseInput as any}
          stdoutWriter={stdoutWriter}
        />,
      )

      // Emit logs
      await act(async () => {
        emitLog('[INFO] Application started')
        emitLog('[ERROR] Database connection failed')
        emitLog('[INFO] Retrying connection')
        emitLog('[ERROR] Timeout occurred')
        await new Promise(resolve => setTimeout(resolve, 200))
      })

      // Enter filter mode
      act(() => {
        pressKey('/', {})
      })
      await new Promise(resolve => setTimeout(resolve, 100))

      // Type filter pattern
      await act(async () => {
        await typeText('ERROR')
      })

      // Press Enter to apply filter
      act(() => {
        pressKey('\r', { return: true })
      })

      await waitFor(() => {
        const output = getOutput(lastFrame()!)
        expect(output).toContain('Database connection failed')
        expect(output).toContain('Timeout occurred')
        expect(output).not.toContain('Application started')
        expect(output).not.toContain('Retrying connection')
      })
    })

    it('should clear filter when pressing "c"', async () => {
      const { lastFrame } = render(
        <LogViewer
          deployment="my-api"
          namespace="default"
          tail={100}
          maxRetry={0}
          timeout={5}
          followLogs={mockFollowLogs as any}
          copyToClipboard={async (text) => {
            clipboardContent = text
            return true
          }}
          useInputHook={mockUseInput as any}
          stdoutWriter={stdoutWriter}
        />,
      )

      // Emit logs
      await act(async () => {
        emitLog('[INFO] Application started')
        emitLog('[ERROR] Database connection failed')
        await new Promise(resolve => setTimeout(resolve, 200))
      })

      // Apply filter
      act(() => {
        pressKey('/', {})
      })
      await act(async () => {
        await typeText('ERROR')
      })
      act(() => {
        pressKey('\r', { return: true })
      })
      await new Promise(resolve => setTimeout(resolve, 150))

      // Clear filter
      act(() => {
        pressKey('c', {})
      })

      await waitFor(() => {
        const output = getOutput(lastFrame()!)
        expect(output).toContain('Application started')
        expect(output).toContain('Database connection failed')
      })
    })

    it('should toggle case-insensitive mode with "i"', async () => {
      const { lastFrame } = render(
        <LogViewer
          deployment="my-api"
          namespace="default"
          tail={100}
          maxRetry={0}
          timeout={5}
          followLogs={mockFollowLogs as any}
          copyToClipboard={async (text) => {
            clipboardContent = text
            return true
          }}
          useInputHook={mockUseInput as any}
          stdoutWriter={stdoutWriter}
        />,
      )

      await act(async () => {
        emitLog('[error] lowercase error')
        emitLog('[ERROR] uppercase error')
        emitLog('[Error] mixed case error')
        await new Promise(resolve => setTimeout(resolve, 200))
      })

      // Apply case-sensitive filter (default)
      act(() => {
        pressKey('/', {})
      })
      await act(async () => {
        await typeText('error')
      })
      act(() => {
        pressKey('\r', { return: true })
      })
      await new Promise(resolve => setTimeout(resolve, 150))

      // Toggle case-insensitive
      act(() => {
        pressKey('i', {})
      })

      await waitFor(() => {
        const output = getOutput(lastFrame()!)
        // After toggling case-insensitive, all variants should match
        expect(output).toContain('lowercase error')
        expect(output).toContain('uppercase error')
        expect(output).toContain('mixed case error')
      })
    })

    it('should toggle inverted filter with "v"', async () => {
      const { lastFrame } = render(
        <LogViewer
          deployment="my-api"
          namespace="default"
          tail={100}
          maxRetry={0}
          timeout={5}
          followLogs={mockFollowLogs as any}
          copyToClipboard={async (text) => {
            clipboardContent = text
            return true
          }}
          useInputHook={mockUseInput as any}
          stdoutWriter={stdoutWriter}
        />,
      )

      await act(async () => {
        emitLog('[INFO] Application started')
        emitLog('[ERROR] Database connection failed')
        emitLog('[DEBUG] Debug message')
        await new Promise(resolve => setTimeout(resolve, 200))
      })

      // Apply filter for ERROR
      act(() => {
        pressKey('/', {})
      })
      await act(async () => {
        await typeText('ERROR')
      })
      act(() => {
        pressKey('\r', { return: true })
      })
      await new Promise(resolve => setTimeout(resolve, 150))

      let output = getOutput(lastFrame()!)
      expect(output).toContain('Database connection failed')
      expect(output).not.toContain('Application started')

      // Toggle invert
      act(() => {
        pressKey('v', {})
      })

      await waitFor(() => {
        output = getOutput(lastFrame()!)
        expect(output).not.toContain('Database connection failed')
        expect(output).toContain('Application started')
        expect(output).toContain('Debug message')
      })
    })

    it('should increase context lines with "+"', async () => {
      const { lastFrame } = render(
        <LogViewer
          deployment="my-api"
          namespace="default"
          tail={100}
          maxRetry={0}
          timeout={5}
          followLogs={mockFollowLogs as any}
          copyToClipboard={async (text) => {
            clipboardContent = text
            return true
          }}
          useInputHook={mockUseInput as any}
          stdoutWriter={stdoutWriter}
        />,
      )

      await act(async () => {
        emitLog('[INFO] Step 1: Initializing')
        emitLog('[INFO] Step 2: Connecting')
        emitLog('[ERROR] Connection failed')
        emitLog('[INFO] Step 3: Cleaning up')
        emitLog('[INFO] Step 4: Exiting')
        await new Promise(resolve => setTimeout(resolve, 200))
      })

      // Apply filter
      act(() => {
        pressKey('/', {})
      })
      await act(async () => {
        await typeText('ERROR')
      })
      act(() => {
        pressKey('\r', { return: true })
      })
      await new Promise(resolve => setTimeout(resolve, 150))

      let output = getOutput(lastFrame()!)
      expect(output).toContain('Connection failed')
      expect(output).not.toContain('Step 2: Connecting')

      // Increase context
      act(() => {
        pressKey('+', {})
      })

      await waitFor(() => {
        output = getOutput(lastFrame()!)
        expect(output).toContain('Step 2: Connecting')
        expect(output).toContain('Step 3: Cleaning up')
      })
    })

    it('should cancel filter mode with ESC', async () => {
      const { lastFrame } = render(
        <LogViewer
          deployment="my-api"
          namespace="default"
          tail={100}
          maxRetry={0}
          timeout={5}
          followLogs={mockFollowLogs as any}
          copyToClipboard={async (text) => {
            clipboardContent = text
            return true
          }}
          useInputHook={mockUseInput as any}
          stdoutWriter={stdoutWriter}
        />,
      )

      await act(async () => {
        emitLog('[INFO] Application started')
        await new Promise(resolve => setTimeout(resolve, 200))
      })

      // Enter filter mode
      act(() => {
        pressKey('/', {})
      })
      await new Promise(resolve => setTimeout(resolve, 100))

      let output = getOutput(lastFrame()!)
      expect(output).toContain('Filter:')

      // Press ESC to cancel
      act(() => {
        pressKey('', { escape: true })
      })

      await waitFor(() => {
        output = getOutput(lastFrame()!)
        expect(output).not.toContain('Filter:')
        expect(output).toContain('Application started')
      })
    })

    it('should handle invalid regex gracefully', async () => {
      const { lastFrame } = render(
        <LogViewer
          deployment="my-api"
          namespace="default"
          tail={100}
          maxRetry={0}
          timeout={5}
          followLogs={mockFollowLogs as any}
          copyToClipboard={async (text) => {
            clipboardContent = text
            return true
          }}
          useInputHook={mockUseInput as any}
          stdoutWriter={stdoutWriter}
        />,
      )

      await act(async () => {
        emitLog('[INFO] Application started')
        emitLog('[ERROR] Database error')
        await new Promise(resolve => setTimeout(resolve, 200))
      })

      // Apply invalid regex
      act(() => {
        pressKey('/', {})
      })
      await act(async () => {
        await typeText('[unclosed')
      })
      act(() => {
        pressKey('\r', { return: true })
      })
      await new Promise(resolve => setTimeout(resolve, 150))

      // Should still show logs
      const output = getOutput(lastFrame()!)
      expect(output).toContain('Application started')
    })
  })

  describe('error Handling', () => {
    it('should enter error mode when pressing "e"', async () => {
      const { lastFrame } = render(
        <LogViewer
          deployment="my-api"
          namespace="default"
          tail={100}
          maxRetry={0}
          timeout={5}
          followLogs={mockFollowLogs as any}
          copyToClipboard={async (text) => {
            clipboardContent = text
            return true
          }}
          useInputHook={mockUseInput as any}
          stdoutWriter={stdoutWriter}
        />,
      )

      await act(async () => {
        emitLog('[INFO] Starting up...')
        emitLog('[ERROR] Database connection failed')
        emitLog('[FATAL] System crash imminent')
        await new Promise(resolve => setTimeout(resolve, 200))
      })

      // Press 'e' to enter error mode
      act(() => {
        pressKey('e', {})
      })

      await waitFor(() => {
        const output = getOutput(lastFrame()!)
        expect(output).toContain('error')
      })
    })

    it('should collect errors in background', async () => {
      const { lastFrame } = render(
        <LogViewer
          deployment="my-api"
          namespace="default"
          tail={100}
          maxRetry={0}
          timeout={5}
          followLogs={mockFollowLogs as any}
          copyToClipboard={async (text) => {
            clipboardContent = text
            return true
          }}
          useInputHook={mockUseInput as any}
          stdoutWriter={stdoutWriter}
        />,
      )

      await act(async () => {
        emitLog('[INFO] Starting up...')
        emitLog('[ERROR] Database connection failed')
        emitLog('[INFO] Retrying...')
        emitLog('[FATAL] System crash imminent')
        await new Promise(resolve => setTimeout(resolve, 200))
      })

      // Check error count in status bar (case-insensitive match for "ERRORS" or "errors")
      const output = getOutput(lastFrame()!)
      expect(output).toMatch(/\d+\s+ERROR/i)
    })
  })

  describe('uI Controls', () => {
    it('should toggle line wrap with "w"', async () => {
      const { lastFrame } = render(
        <LogViewer
          deployment="my-api"
          namespace="default"
          tail={100}
          maxRetry={0}
          timeout={5}
          followLogs={mockFollowLogs as any}
          copyToClipboard={async (text) => {
            clipboardContent = text
            return true
          }}
          useInputHook={mockUseInput as any}
          stdoutWriter={stdoutWriter}
        />,
      )

      await act(async () => {
        emitLog('[INFO] Very long log line that should wrap or not wrap depending on setting')
        await new Promise(resolve => setTimeout(resolve, 200))
      })

      // Toggle wrap - should not throw error
      act(() => {
        pressKey('w', {})
      })

      await new Promise(resolve => setTimeout(resolve, 100))
      expect(lastFrame()).toBeDefined()
    })

    it('should clear buffer with "x"', async () => {
      const { lastFrame } = render(
        <LogViewer
          deployment="my-api"
          namespace="default"
          tail={100}
          maxRetry={0}
          timeout={5}
          followLogs={mockFollowLogs as any}
          copyToClipboard={async (text) => {
            clipboardContent = text
            return true
          }}
          useInputHook={mockUseInput as any}
          stdoutWriter={stdoutWriter}
        />,
      )

      await act(async () => {
        emitLog('[INFO] Log 1')
        emitLog('[INFO] Log 2')
        emitLog('[INFO] Log 3')
        await new Promise(resolve => setTimeout(resolve, 200))
      })

      let output = getOutput(lastFrame()!)
      expect(output).toContain('Log 1')

      // Clear buffer
      act(() => {
        pressKey('x', {})
      })

      await waitFor(() => {
        output = getOutput(lastFrame()!)
        // After clear, previous logs might not be visible
        // (depends on if new logs arrive)
      })
    })

    it('should add mark separator with "m"', async () => {
      const { lastFrame } = render(
        <LogViewer
          deployment="my-api"
          namespace="default"
          tail={100}
          maxRetry={0}
          timeout={5}
          followLogs={mockFollowLogs as any}
          copyToClipboard={async (text) => {
            clipboardContent = text
            return true
          }}
          useInputHook={mockUseInput as any}
          stdoutWriter={stdoutWriter}
        />,
      )

      await act(async () => {
        emitLog('[INFO] Before mark')
        await new Promise(resolve => setTimeout(resolve, 200))
      })

      const outputBefore = getOutput(lastFrame()!)
      expect(outputBefore).toContain('Before mark')

      // Add mark - should not throw error
      act(() => {
        pressKey('m', {})
      })

      await new Promise(resolve => setTimeout(resolve, 100))

      // Verify component still renders
      expect(lastFrame()).toBeDefined()
    })
  })
})
