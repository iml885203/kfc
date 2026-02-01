import chalk from 'chalk'
import { Box, Text, useApp, useInput, useStdout } from 'ink'
import Spinner from 'ink-spinner'
import * as React from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useErrorCollection } from '../hooks/useErrorCollection.js'
import { useLogBuffer } from '../hooks/useLogBuffer.js'
import { useLogFilter } from '../hooks/useLogFilter.js'
import { followLogs as defaultFollowLogs } from '../k8s/client.js'
import { copyToClipboard as defaultCopyToClipboard, formatErrorLine, formatErrorWithContext } from '../utils/clipboard.js'
import { colorizeLogLine } from '../utils/colorize.js'
import { filterLines, shouldShowLine } from '../utils/logFilter.js'
import { highlightMatches } from '../utils/logHighlight.js'
import ErrorMode from './ErrorMode.js'

export interface StdoutWriter {
  write: (text: string) => void
}

interface LogViewerProps {
  deployment: string
  namespace: string
  context?: string
  tail: number
  maxRetry: number
  timeout: number
  grepPattern?: string
  grepAfter?: number
  grepBefore?: number
  grepContext?: number
  grepIgnoreCase?: boolean
  grepInvert?: boolean
  onBack?: () => void
  followLogs?: typeof defaultFollowLogs
  copyToClipboard?: typeof defaultCopyToClipboard
  useInputHook?: typeof useInput
  stdoutWriter?: StdoutWriter // Dependency injection for stdout writes (for testing)
}

export default function LogViewer({
  deployment,
  namespace,
  context,
  tail,
  maxRetry,
  timeout,
  grepPattern: initialPattern,
  grepAfter: initialAfter = 0,
  grepBefore: initialBefore = 0,
  grepContext: initialContext = 0,
  grepIgnoreCase: initialIgnoreCase = false,
  grepInvert: initialInvert = false,
  onBack,
  followLogs = defaultFollowLogs,
  copyToClipboard = defaultCopyToClipboard,
  useInputHook = useInput,
  stdoutWriter: injectedStdoutWriter,
}: LogViewerProps) {
  const { exit } = useApp()
  const { write: defaultWrite } = useStdout()

  // Stabilize write function to avoid unnecessary effect re-runs
  // Use ref to store the latest write function without triggering re-renders
  const writeRef = useRef(injectedStdoutWriter?.write || defaultWrite)
  useEffect(() => {
    writeRef.current = injectedStdoutWriter?.write || defaultWrite
  }, [injectedStdoutWriter?.write, defaultWrite])

  // Create stable write function that always calls the latest ref value
  const write = useCallback((text: string) => {
    writeRef.current(text)
  }, [])

  // Connection state
  const [_status, setStatus] = useState<string>('Connecting...')
  const [connectionProgress, setConnectionProgress] = useState<string>('')
  const [retryCount, setRetryCount] = useState(0)
  const [isConnected, setIsConnected] = useState(false)

  // Use custom hooks for buffer and filter management
  const { buffer, addLine, clear } = useLogBuffer(10000)
  const filter = useLogFilter(
    initialPattern,
    initialAfter,
    initialBefore,
    initialContext,
    initialIgnoreCase,
    initialInvert,
  )

  // Interactive state
  const [filterMode, setFilterMode] = useState(false)
  const [filterInput, setFilterInput] = useState('')
  const [paused, setPaused] = useState(false)
  const [isWrap, setIsWrap] = useState(true)

  // Error mode state
  const [errorMode, setErrorMode] = useState(false)
  const [selectedErrorIndex, setSelectedErrorIndex] = useState<number | null>(null)
  const [copyMessage, setCopyMessage] = useState<string | null>(null)

  // Error collection hook - runs continuously in background
  const { errors, errorCount, addLogLine: addErrorLogLine, getError } = useErrorCollection(
    deployment,
    namespace,
    context,
  )

  // Track current filter state for the log callback (to avoid closure staleness)
  const currentFilter = useRef(filter)
  const isConnectedRef = useRef(isConnected)
  useEffect(() => {
    currentFilter.current = filter
    isConnectedRef.current = isConnected
    // Re-filter when filter settings change
    refilterAndDisplay()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, isConnected]) // refilterAndDisplay uses stable write via useCallback

  // Initialize screen with space for status bar
  const hasInitialized = useRef(false)
  useEffect(() => {
    if (!hasInitialized.current) {
      write('\n\n\n')
      hasInitialized.current = true
    }
    // Restore wrap on exit
    return () => {
      write('\x1B[?7h')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // write is stable via useCallback, no need to include in deps

  // Handle wrap toggling
  useEffect(() => {
    write(isWrap ? '\x1B[?7h' : '\x1B[?7l')
    if (isConnected) {
      refilterAndDisplay()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isWrap]) // write is stable via useCallback, no need to include in deps

  // Function to clear screen and display filtered logs
  function refilterAndDisplay() {
    // Clear screen
    write('\x1Bc')

    const { pattern, ignoreCase, invert, context, before, after } = currentFilter.current

    const filtered = filterLines(
      buffer.current,
      pattern,
      ignoreCase,
      invert,
      context,
      before,
      after,
    )

    if (filtered.length === 0 && pattern) {
      write(chalk.yellow(`No matches found for pattern: ${pattern}\n\n`))
    }
    else {
      let lastIdx = -2
      filtered.forEach(({ bufferedLine, isMatch, index }) => {
        // Add separator for gaps
        if (index - lastIdx > 1 && pattern) {
          write(chalk.gray('--\n'))
        }

        // Highlight matches in the line
        const highlightedLine = pattern && isMatch
          ? highlightMatches(bufferedLine.line, pattern, ignoreCase)
          : bufferedLine.line

        // Re-colorize the highlighted line
        const coloredLine = colorizeLogLine(highlightedLine)

        const prefix = isMatch && pattern ? chalk.red('> ') : '  '
        const podPart = bufferedLine.podPrefix ? `${bufferedLine.podPrefix} ` : ''
        write(`${prefix}${podPart}${coloredLine}\n`)
        lastIdx = index
      })
    }
  }

  // Track if help is showing
  const [isShowingHelp, setIsShowingHelp] = useState(false)
  const isShowingHelpRef = useRef(false)

  // Track error mode ref for callbacks
  const errorModeRef = useRef(false)
  useEffect(() => {
    errorModeRef.current = errorMode
  }, [errorMode])

  // Sync state to ref for callback access
  useEffect(() => {
    isShowingHelpRef.current = isShowingHelp
    if (isShowingHelp) {
      write('\x1Bc')
    }
    else {
      // Restore logs when closing help
      if (isConnected && !errorMode) {
        refilterAndDisplay()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isShowingHelp, isConnected, errorMode, write]) // refilterAndDisplay is stable

  // Auto-clear copy message
  useEffect(() => {
    if (copyMessage) {
      const timer = setTimeout(() => setCopyMessage(null), 2000)
      return () => clearTimeout(timer)
    }
  }, [copyMessage])

  // Handle keyboard input
  useInputHook((input, key) => {
    if (isShowingHelp) {
      // Any key exits help
      setIsShowingHelp(false)
      return
    }

    if (!isConnected) {
      return
    }

    // Error mode shortcuts
    if (errorMode) {
      // Number keys 1-9 to select error
      const num = Number.parseInt(input)
      if (!Number.isNaN(num) && num >= 1 && num <= Math.min(9, errors.length)) {
        setSelectedErrorIndex(num)
        return
      }

      // 'y' - copy single line
      if (input === 'y' && selectedErrorIndex !== null) {
        const error = getError(selectedErrorIndex)
        if (error) {
          const formatted = formatErrorLine(
            error.pod,
            error.container,
            error.timeString,
            error.rawLine,
          )
          copyToClipboard(formatted).then((success) => {
            setCopyMessage(success ? '✓ Copied to clipboard' : '✗ Copy failed')
          })
        }
        return
      }

      // 'Y' - copy with context
      if (input === 'Y' && selectedErrorIndex !== null) {
        const error = getError(selectedErrorIndex)
        if (error) {
          const contextBefore = error.contextBefore.map(l => l.raw)
          const contextAfter = error.contextAfter.map(l => l.raw)
          const formatted = formatErrorWithContext(
            error.pod,
            error.container,
            error.timeString,
            error.rawLine,
            contextBefore,
            contextAfter,
            deployment,
            namespace,
          )
          copyToClipboard(formatted).then((success) => {
            const totalLines = 1 + contextBefore.length + contextAfter.length
            setCopyMessage(
              success
                ? `✓ Copied ${totalLines} lines with context`
                : '✗ Copy failed',
            )
          })
        }
        return
      }

      // 'e' or ESC - exit error mode
      if (input === 'e' || key.escape) {
        setErrorMode(false)
        setSelectedErrorIndex(null)
        setCopyMessage(null)
        // Restore logs display
        if (isConnected) {
          refilterAndDisplay()
        }
        return
      }

      // Other keys in error mode are ignored
      return
    }

    if (filterMode) {
      // In filter mode, handle text input
      if (key.return) {
        // Apply filter
        filter.setPattern(filterInput)
        setFilterMode(false)
      }
      else if (key.escape) {
        // Cancel filter
        setFilterMode(false)
        setFilterInput('')
      }
      else if (key.backspace || key.delete) {
        if (key.meta) {
          // Option+Delete: Remove last word
          setFilterInput((prev) => {
            const words = prev.trimEnd().split(' ')
            words.pop()
            return words.join(' ') + (words.length > 0 ? ' ' : '')
          })
          return
        }

        if (key.ctrl) {
          // Ctrl+Backspace
          setFilterInput('')
          return
        }

        setFilterInput(prev => prev.slice(0, -1))
      }
      else if (key.ctrl && input === 'u') {
        // Ctrl+U (Cmd+Delete often sends this)
        setFilterInput('')
      }
      else if (!key.ctrl && !key.meta && input) {
        setFilterInput(prev => prev + input)
      }
    }
    else {
      // Normal mode - keyboard shortcuts
      if (input === 'e') {
        // Enter error mode
        setErrorMode(true)
        setSelectedErrorIndex(null)
      }
      else if (input === '/') {
        // Enter filter mode
        setFilterMode(true)
        setFilterInput(filter.pattern)
      }
      else if (input === 'c') {
        // Clear filter
        filter.clearFilter()
      }
      else if (input === 'i') {
        // Toggle ignore case
        filter.toggleIgnoreCase()
      }
      else if (input === 'v') {
        // Toggle invert
        filter.toggleInvert()
      }
      else if (input === 'p') {
        // Toggle pause
        setPaused(prev => !prev)
      }
      else if (input === '+') {
        // Increase context
        filter.increaseContext()
      }
      else if (input === '-') {
        // Decrease context
        filter.decreaseContext()
      }
      else if (input === '?') {
        setIsShowingHelp(true)
      }
      else if (key.escape && onBack) {
        onBack()
      }
      else if (input === 'x' || (key.ctrl && input === 'l')) {
        // Clear logs
        clear()
        refilterAndDisplay()
      }
      else if (input === 'm') {
        // Mark separator
        const separator = chalk.dim('----------------------------------------------------------------')
        const markLine = {
          podPrefix: '',
          line: '',
          coloredLine: separator,
          timestamp: Date.now(),
        }
        addLine(markLine)
        if (!paused) {
          write(`  ${separator}\n`)
        }
      }
      else if (input === 'w') {
        // Toggle wrap
        setIsWrap(prev => !prev)
      }
    }
  }, { isActive: true })

  // Connection state check for non-exit keys
  useEffect(() => {
    if (!isConnected && filterMode) {
      // eslint-disable-next-line react-hooks-extra/no-direct-set-state-in-use-effect
      setFilterMode(false)
    }
  }, [isConnected, filterMode])

  // Main log streaming effect
  useEffect(() => {
    let cancelled = false
    const timers: NodeJS.Timeout[] = []

    // Helper to safely add timer and ensure cleanup
    const addTimer = (timer: NodeJS.Timeout) => {
      timers.push(timer)
    }

    async function startFollowing() {
      try {
        setStatus(`Connecting to ${deployment}...`)
        setConnectionProgress('Initializing...')
        setIsConnected(false)

        await followLogs(
          deployment,
          namespace,
          context,
          tail,
          (logLine) => {
            if (!cancelled && !paused) {
              // Mark as connected on first log
              if (!isConnectedRef.current) {
                setIsConnected(true)
                setStatus(`Following logs for ${deployment}`)
                setConnectionProgress('')
              }

              const podPrefix = `[${logLine.pod}/${logLine.container}]`
              const coloredLine = colorizeLogLine(logLine.line)

              const bufferedLine = {
                podPrefix,
                line: logLine.line,
                coloredLine,
                timestamp: Date.now(),
              }

              // Add to buffer
              addLine(bufferedLine)

              // CRITICAL: Add to error collection (runs continuously regardless of mode)
              addErrorLogLine(logLine.line, coloredLine, logLine.pod, logLine.container)

              // Use current filter state from ref
              const { pattern, ignoreCase, invert } = currentFilter.current

              // Check if should display using utils
              // shouldShowLine is now safe against invalid regex (returns true)
              const isMatch = shouldShowLine(logLine.line, pattern, ignoreCase, invert)

              // Only write to stdout if NOT in error mode (error mode has its own rendering)
              if ((!pattern || isMatch) && !isShowingHelpRef.current && !errorModeRef.current) {
                // Highlight matches in real-time
                const highlightedLine = pattern && isMatch
                  ? highlightMatches(logLine.line, pattern, ignoreCase)
                  : logLine.line

                const finalColoredLine = colorizeLogLine(highlightedLine)
                const prefix = isMatch && pattern ? chalk.red('> ') : ''
                write(`${prefix}${podPrefix} ${finalColoredLine}\n`)
              }
            }
          },
          (error) => {
            if (!cancelled) {
              setIsConnected(false)
              setConnectionProgress('')
              if (retryCount < maxRetry) {
                setRetryCount(prev => prev + 1)
                const nextRetry = retryCount + 1
                setStatus(`Connection lost. Retrying (${nextRetry}/${maxRetry})...`)
                const retryTimer = setTimeout(() => {
                  if (!cancelled) {
                    startFollowing()
                  }
                }, 2000)
                addTimer(retryTimer)
              }
              else {
                setStatus(`Failed after ${maxRetry} attempts: ${error.message}`)
                write(chalk.red(`\n✗ Error: ${error.message}\n`))
                const exitTimer = setTimeout(() => {
                  if (!cancelled) {
                    exit()
                  }
                }, 3000)
                addTimer(exitTimer)
              }
            }
          },
          (progressMsg) => {
            setConnectionProgress(progressMsg)
          },
          timeout * 1000,
        )
      }
      catch (error) {
        if (!cancelled) {
          const errorMsg = error instanceof Error ? error.message : String(error)
          setStatus(`Error: ${errorMsg}`)
          setConnectionProgress('')
          write(chalk.red(`\n✗ ${errorMsg}\n`))
          const exitTimer = setTimeout(() => {
            if (!cancelled) {
              exit(new Error(String(error)))
            }
          }, 3000)
          addTimer(exitTimer)
        }
      }
    }

    startFollowing()

    return () => {
      cancelled = true
      timers.forEach(timer => clearTimeout(timer))
    }
    // Note: Intentionally excluding some dependencies to avoid infinite loops
    // - addErrorLogLine, addLine, write are stable functions from hooks/props
    // - followLogs, exit are stable functions
    // - isConnected is tracked via ref to avoid re-renders
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deployment, namespace, context, tail, retryCount, paused, maxRetry, timeout])

  // Build status info
  const _contextInfo = context ? chalk.blue(`[${context}]`) : ''
  const _namespaceInfo = chalk.yellow(`[${namespace}]`)
  const _deploymentInfo = chalk.cyan(deployment)

  const filterInfo = filter.pattern
    ? ` | ${filter.invert ? 'NOT ' : ''}/${filter.pattern}/${filter.ignoreCase ? 'i' : ''}${
      filter.context > 0 ? ` ±${filter.context}` : ''
    }`
    : ''

  const pauseInfo = paused ? ' [PAUSED]' : ''
  const modeInfo = filterMode ? ' [FILTER MODE]' : ''
  const wrapInfo = !isWrap ? ' [NO WRAP]' : ''
  const bufferInfo = ` (${buffer.current.length})`
  const errorInfo = errorCount > 0 ? ` [🔴 ${errorCount} ERROR${errorCount > 1 ? 'S' : ''}]` : ''

  if (isShowingHelp) {
    return (
      <Box flexDirection="column" padding={1} borderStyle="double" borderColor="cyan">
        <Text bold color="cyan" underline>KFC Interactive Mode - Keyboard Shortcuts</Text>
        <Box marginTop={1} flexDirection="column">
          <Text bold color="red">Error Mode:</Text>
          <Text>
            <Text color="yellow" bold>e</Text>
            {' '}
            Enter error mode (view only errors)
          </Text>
          <Text>
            <Text color="yellow" bold>1-9</Text>
            {' '}
            Select error by number (in error mode)
          </Text>
          <Text>
            <Text color="yellow" bold>y</Text>
            {' '}
            Copy selected error line
          </Text>
          <Text>
            <Text color="yellow" bold>Y</Text>
            {' '}
            Copy selected error with context
          </Text>
          <Box marginTop={1}>
            <Text bold color="cyan">Filtering:</Text>
          </Box>
          <Text>
            <Text color="yellow" bold>/</Text>
            {' '}
            Filter logs (type pattern, press Enter)
          </Text>
          <Text>
            <Text color="yellow" bold>c</Text>
            {' '}
            Clear filter
          </Text>
          <Text>
            <Text color="yellow" bold>i</Text>
            {' '}
            Toggle case-insensitive matching
          </Text>
          <Text>
            <Text color="yellow" bold>v</Text>
            {' '}
            Toggle invert match
          </Text>
          <Text>
            <Text color="yellow" bold>+</Text>
            {' '}
            Increase context lines
          </Text>
          <Text>
            <Text color="yellow" bold>-</Text>
            {' '}
            Decrease context lines
          </Text>
          <Box marginTop={1}>
            <Text bold color="green">Control:</Text>
          </Box>
          <Text>
            <Text color="yellow" bold>p</Text>
            {' '}
            Toggle pause/resume log streaming
          </Text>
          <Text>
            <Text color="yellow" bold>x</Text>
            {' '}
            Clear logs (or Ctrl+L)
          </Text>
          <Text>
            <Text color="yellow" bold>m</Text>
            {' '}
            Add mark separator (----)
          </Text>
          <Text>
            <Text color="yellow" bold>w</Text>
            {' '}
            Toggle text wrapping
          </Text>
          <Text>
            <Text color="yellow" bold>?</Text>
            {' '}
            Show this help
          </Text>
          <Text>
            <Text color="yellow" bold>Esc</Text>
            {' '}
            Go back
          </Text>
        </Box>
        <Box marginTop={1}>
          <Text dimColor>Press any key to return...</Text>
        </Box>
      </Box>
    )
  }

  // Render error mode
  if (errorMode) {
    return (
      <Box flexDirection="column">
        <ErrorMode
          errors={errors}
          deployment={deployment}
          namespace={namespace}
          context={context}
          onKeyPress={(_input, _key) => {
            // This is handled by the main useInput hook above
          }}
          copyToClipboard={copyToClipboard}
          selectedIndex={selectedErrorIndex}
          onSelectionChange={setSelectedErrorIndex}
        />

        {/* Copy message overlay */}
        {copyMessage && (
          <Box marginTop={1} borderStyle="single" borderColor="green" paddingX={1}>
            <Text color="green">{copyMessage}</Text>
          </Box>
        )}

        {/* Real-time error counter */}
        <Box marginTop={1}>
          <Text dimColor>
            Streaming:
            {' '}
            {isConnected ? 'Active' : 'Disconnected'}
            {' '}
            •
            {' '}
            {errorCount}
            {' '}
            error
            {errorCount !== 1 ? 's' : ''}
            {' '}
            collected •
            {' '}
            Logs continue in background
          </Text>
        </Box>
      </Box>
    )
  }

  return (
    <Box flexDirection="column">
      {/* Status bar */}
      <Box borderStyle="round" borderColor="cyan" paddingX={1}>
        <Text>
          <Text color={isConnected ? 'green' : 'gray'}>{isConnected ? '●' : '○'}</Text>
          {context && (
            <Text color="blue">
              {' '}
              [
              {context}
              ]
            </Text>
          )}
          <Text color="yellow">
            {' '}
            [
            {namespace}
            ]
          </Text>
          <Text color="cyan">
            {' '}
            {deployment}
          </Text>
          <Text color="magenta">{filterInfo}</Text>
          <Text color="red">{errorInfo}</Text>
          <Text color="yellow">{pauseInfo}</Text>
          <Text color="red">{wrapInfo}</Text>
          <Text color="yellow">{modeInfo}</Text>
          <Text dimColor>{bufferInfo}</Text>
        </Text>
      </Box>

      {/* Filter input bar */}
      {filterMode && (
        <Box borderStyle="single" borderColor="yellow" paddingX={1} marginTop={1}>
          <Text color="yellow">
            Filter:
            {' '}
            <Text color="white">{filterInput}</Text>
            <Text dimColor> (Enter to apply, Esc to cancel)</Text>
          </Text>
        </Box>
      )}

      {/* Help hint - only show when not filtering and connected */}
      {!filterMode && isConnected && (
        <Box marginTop={1}>
          <Text dimColor>
            Press
            {' '}
            <Text color="yellow">?</Text>
            {' '}
            for help,
            <Text color="yellow">/</Text>
            {' '}
            to filter,
            <Text color="yellow">e</Text>
            {' '}
            for errors
          </Text>
        </Box>
      )}

      {/* Loading indicator when connecting */}
      {!isConnected && (
        <Box marginTop={1}>
          <Text color="yellow">
            <Spinner type="dots" />
            {' '}
            {connectionProgress || 'Connecting...'}
            {retryCount > 0 && ` (Retry ${retryCount}/${maxRetry})`}
          </Text>
        </Box>
      )}
    </Box>
  )
}
