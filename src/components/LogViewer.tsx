import type { ErrorDetector } from '../utils/errorDetector.js'
import { Box, Text, useApp, useInput, useStdout } from 'ink'
import Spinner from 'ink-spinner'
import * as React from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useErrorCollection } from '../hooks/useErrorCollection.js'
import { useLogBuffer } from '../hooks/useLogBuffer.js'
import { useLogDisplayState } from '../hooks/useLogDisplayState.js'
import { useLogFilter } from '../hooks/useLogFilter.js'
import { useLogInputHandler } from '../hooks/useLogInputHandler.js'
import { useLogRenderer } from '../hooks/useLogRenderer.js'
import { useLogStream } from '../hooks/useLogStream.js'
import { followLogs as defaultFollowLogs } from '../k8s/client.js'
import { copyToClipboard as defaultCopyToClipboard } from '../utils/clipboard.js'
import ErrorMode from './ErrorMode.js'
import LogViewerHelp from './LogViewerHelp.js'
import LogViewerStatusBar from './LogViewerStatusBar.js'

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
  stdoutWriter?: StdoutWriter
  errorDetector?: ErrorDetector
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
  onBack: _onBack,
  followLogs = defaultFollowLogs,
  copyToClipboard = defaultCopyToClipboard,
  useInputHook = useInput,
  stdoutWriter: injectedStdoutWriter,
  errorDetector,
}: LogViewerProps) {
  const { exit } = useApp()
  const { stdout, write: defaultWrite } = useStdout()

  // Stabilize write function
  const writeRef = useRef(injectedStdoutWriter?.write || defaultWrite)
  useEffect(() => {
    writeRef.current = injectedStdoutWriter?.write || defaultWrite
  }, [injectedStdoutWriter?.write, defaultWrite])

  const write = useCallback((text: string) => {
    writeRef.current(text)
  }, [])

  // 1. Hooks Initialization
  const { buffer: bufferRef, addLine, clear, bufferVersion } = useLogBuffer(10000)
  const displayState = useLogDisplayState()

  const filter = useLogFilter(
    initialPattern,
    initialAfter,
    initialBefore,
    initialContext,
    initialIgnoreCase,
    initialInvert,
  )

  // Error Mode State
  const [errorMode, setErrorMode] = useState(false)
  // Removed state managed by ErrorMode
  // const [selectedErrorIndex, setSelectedErrorIndex] = useState<number | null>(null)
  // const [errorScrollOffset, setErrorScrollOffset] = useState(0)
  // const [copyMessage, setCopyMessage] = useState<string | null>(null)

  const { errors, errorCount, addLogLine: addErrorLogLine, getError } = useErrorCollection(
    deployment,
    namespace,
    context,
    errorDetector ? { errorDetector } : undefined,
  )

  const { status, connectionProgress, retryCount, isConnected } = useLogStream({
    deployment,
    namespace,
    context,
    tail,
    maxRetry,
    timeout,
    paused: displayState.paused,
    followLogs,
    addLine,
    addErrorLogLine,
  })

  // 2. Input Handling
  const { filterInput } = useLogInputHandler({
    useInputHook,
    exit,
    write,
    // copyToClipboard, // Removed from interface
    onBack: undefined, // No back button in log viewer
    displayState,
    filter,
    buffer: { addLine, clear },
    errorCollection: { errors, getError },
    isConnected,
    errorMode,
    setErrorMode,
    stdoutRows: stdout?.rows,
  })

  // 3. Rendering Logic
  useLogRenderer({
    write,
    bufferRef,
    filter,
    errorDetector,
    isConnected,
    errorMode,
    displayState,
    bufferVersion,
  })

  // 4. View Rendering
  if (displayState.isShowingHelp) {
    return <LogViewerHelp />
  }

  if (errorMode) {
    return (
      <Box flexDirection="column">
        <ErrorMode
          errors={errors}
          deployment={deployment}
          namespace={namespace}
          context={context}
          copyToClipboard={copyToClipboard}
          onExit={() => setErrorMode(false)}
        />

        <Box marginTop={1}>
          <Text dimColor>
            Streaming:
            {' '}
            {isConnected ? 'Active' : 'Disconnected'}
            {' '}
            •
            <Text color={errorCount > 0 ? 'red' : 'dimColor'}>{errorCount}</Text>
            {' '}
            error
            {errorCount !== 1 ? 's' : ''}
            {' '}
            collected • Logs continue in background
          </Text>
        </Box>
      </Box>
    )
  }

  return (
    <Box flexDirection="column">
      <LogViewerStatusBar
        isConnected={isConnected}
        context={context}
        namespace={namespace}
        deployment={deployment}
        filterPattern={filter.pattern}
        filterInvert={filter.invert}
        filterIgnoreCase={filter.ignoreCase}
        filterContext={filter.context}
        errorCount={errorCount}
        paused={displayState.paused}
        isWrap={displayState.isWrap}
        filterMode={displayState.filterMode}
        bufferLength={bufferRef.current.length}
      />

      {displayState.filterMode && (
        <Box borderStyle="single" borderColor="yellow" paddingX={1} marginTop={1}>
          <Text color="yellow">
            Filter:
            {' '}
            <Text color="white">{filterInput}</Text>
            <Text dimColor> (Enter to apply, Esc to cancel)</Text>
          </Text>
        </Box>
      )}

      {!displayState.filterMode && isConnected && (
        <Box marginTop={1}>
          <Text dimColor>
            Press
            {' '}
            <Text color="yellow">?</Text>
            {' '}
            for help,
            {' '}
            <Text color="yellow">/</Text>
            {' '}
            to filter,
            {' '}
            <Text color="yellow">e</Text>
            {' '}
            for errors
          </Text>
        </Box>
      )}

      {!isConnected && (
        <Box marginTop={1}>
          <Text color="yellow">
            <Spinner type="dots" />
            {' '}
            {connectionProgress || status || 'Connecting...'}
            {retryCount > 0 && ` (Retry ${retryCount}/${maxRetry})`}
          </Text>
        </Box>
      )}
    </Box>
  )
}
