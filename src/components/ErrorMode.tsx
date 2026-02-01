/**
 * Error Mode Component - Display errors with selection and copy functionality
 */

import type { ErrorEntry } from '../types/error.js'
import { Box, Text, useStdout } from 'ink'
import * as React from 'react'
import { useCallback, useEffect, useState } from 'react'
import { copyToClipboard, formatErrorLine, formatErrorWithContext } from '../utils/clipboard.js'

interface Key {
  return?: boolean
  escape?: boolean
  ctrl?: boolean
  meta?: boolean
  shift?: boolean
  delete?: boolean
  backspace?: boolean
  upArrow?: boolean
  downArrow?: boolean
  leftArrow?: boolean
  rightArrow?: boolean
}

interface ErrorModeProps {
  errors: ErrorEntry[]
  deployment: string
  namespace: string
  context?: string
  onKeyPress?: (input: string, key: Key) => void
  copyToClipboard?: (text: string) => Promise<boolean>
  selectedIndex?: number | null // Controlled selection from parent
  onSelectionChange?: (index: number | null) => void // Callback for selection changes
  scrollOffset?: number // Scroll offset for windowed display
}

export default function ErrorMode({
  errors,
  deployment,
  namespace,
  context: k8sContext,
  onKeyPress: _onKeyPress,
  copyToClipboard: customCopyToClipboard = copyToClipboard,
  selectedIndex: controlledSelectedIndex,
  onSelectionChange,
  scrollOffset = 0,
}: ErrorModeProps) {
  // Get terminal height for dynamic display calculation
  const { stdout } = useStdout()
  const terminalHeight = stdout?.rows || 25 // Default 25 rows

  // Calculate available height and max visible errors
  // UI overhead: Status bar (3) + Copy message (0-3) + Instructions (2) + Footer (3) + Scroll indicators (0-4) = 10-17 lines
  const [copyMessage, setCopyMessage] = useState<string | null>(null)
  const baseOverhead = copyMessage ? 13 : 10
  const scrollIndicatorOverhead = (scrollOffset > 0 ? 2 : 0) + (scrollOffset + 1 < errors.length ? 2 : 0)
  const uiOverhead = baseOverhead + scrollIndicatorOverhead
  const availableHeight = Math.max(10, terminalHeight - uiOverhead)

  // Each error: ~6 lines average (border + header + pod info + error line)
  // Selected error expands to ~15-30 lines, but we use conservative estimate
  const estimatedLinesPerError = 6
  const maxVisibleErrors = Math.max(1, Math.floor(availableHeight / estimatedLinesPerError))

  // Calculate visible window
  const visibleErrors = errors.slice(scrollOffset, scrollOffset + maxVisibleErrors)
  const hasMoreAbove = scrollOffset > 0
  const hasMoreBelow = scrollOffset + maxVisibleErrors < errors.length

  // Use controlled selection if provided, otherwise use internal state
  const [internalSelectedIndex, setInternalSelectedIndex] = useState<number | null>(null)
  const selectedIndex = controlledSelectedIndex !== undefined ? controlledSelectedIndex : internalSelectedIndex

  const setSelectedIndex = useCallback((index: number | null) => {
    if (controlledSelectedIndex !== undefined && onSelectionChange) {
      onSelectionChange(index)
    }
    else {
      setInternalSelectedIndex(index)
    }
  }, [controlledSelectedIndex, onSelectionChange])

  // Auto-clear copy message after 2 seconds
  useEffect(() => {
    if (copyMessage) {
      const timer = setTimeout(() => setCopyMessage(null), 2000)
      return () => clearTimeout(timer)
    }
  }, [copyMessage])

  const selectedError = selectedIndex !== null
    ? errors.find(err => err.index === selectedIndex)
    : null

  // Note: Number key handling is done in LogViewer's useInput hook
  // This component receives selectedIndex as a prop and displays it accordingly

  // Handle copy actions - memoized to avoid unnecessary re-creations
  const handleCopySingleLine = React.useCallback(async () => {
    if (!selectedError)
      return

    const formatted = formatErrorLine(
      selectedError.pod,
      selectedError.container,
      selectedError.timeString,
      selectedError.rawLine,
    )

    const success = await customCopyToClipboard(formatted)
    if (success) {
      setCopyMessage('✓ Copied to clipboard')
    }
    else {
      setCopyMessage('✗ Copy failed - clipboard not available')
    }
  }, [selectedError, customCopyToClipboard])

  const handleCopyWithContext = React.useCallback(async () => {
    if (!selectedError)
      return

    const contextBefore = selectedError.contextBefore.map(l => l.raw)
    const contextAfter = selectedError.contextAfter.map(l => l.raw)

    const formatted = formatErrorWithContext(
      selectedError.pod,
      selectedError.container,
      selectedError.timeString,
      selectedError.rawLine,
      contextBefore,
      contextAfter,
      deployment,
      namespace,
    )

    const success = await customCopyToClipboard(formatted)
    if (success) {
      const totalLines = 1 + contextBefore.length + contextAfter.length
      setCopyMessage(`✓ Copied ${totalLines} lines with context`)
    }
    else {
      setCopyMessage('✗ Copy failed - clipboard not available')
    }
  }, [selectedError, customCopyToClipboard, deployment, namespace])

  // Expose copy methods for parent component to call (if needed for legacy support)
  // Note: These are now properly memoized, so the effect will only run when dependencies change
  React.useEffect(() => {
    // Store in a ref accessible by parent (for backward compatibility if needed)
    // Using type assertion to extend the component type for legacy support
    const errorModeComponent = ErrorMode as typeof ErrorMode & {
      handleCopySingleLine: typeof handleCopySingleLine
      handleCopyWithContext: typeof handleCopyWithContext
      setSelectedIndex: typeof setSelectedIndex
    }
    errorModeComponent.handleCopySingleLine = handleCopySingleLine
    errorModeComponent.handleCopyWithContext = handleCopyWithContext
    errorModeComponent.setSelectedIndex = setSelectedIndex
  }, [handleCopySingleLine, handleCopyWithContext, setSelectedIndex])

  if (errors.length === 0) {
    return (
      <Box flexDirection="column">
        <Box borderStyle="round" borderColor="cyan" paddingX={1}>
          <Text>
            <Text color="green">●</Text>
            {k8sContext && (
              <Text color="blue">
                {' '}
                [
                {k8sContext}
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
            <Text color="red"> [ERROR MODE]</Text>
            <Text color="green"> 🎉</Text>
          </Text>
        </Box>

        <Box marginTop={1} flexDirection="column" alignItems="center" paddingY={2}>
          <Text color="green" bold>🎉 No Errors!</Text>
          <Box marginTop={1}>
            <Text dimColor>All logs are INFO/DEBUG level so far</Text>
          </Box>
          <Box marginTop={1}>
            <Text dimColor>Monitoring for ERROR/FATAL logs...</Text>
          </Box>
          <Box marginTop={2} borderStyle="single" borderColor="gray" paddingX={2} paddingY={1}>
            <Box flexDirection="column">
              <Text dimColor>Watching for:</Text>
              <Text dimColor>• ERROR, FATAL keywords</Text>
              <Text dimColor>• Exception patterns</Text>
              <Text dimColor>• Stack traces</Text>
            </Box>
          </Box>
          <Box marginTop={2}>
            <Text dimColor>
              Press
              <Text color="yellow">e</Text>
              {' '}
              or
              <Text color="yellow">ESC</Text>
              {' '}
              to return to normal view
            </Text>
          </Box>
        </Box>
      </Box>
    )
  }

  return (
    <Box flexDirection="column">
      {/* Status Bar */}
      <Box borderStyle="round" borderColor="red" paddingX={1}>
        <Text>
          <Text color="red">🔴</Text>
          {k8sContext && (
            <Text color="blue">
              {' '}
              [
              {k8sContext}
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
          <Text color="red" bold> [ERROR MODE]</Text>
          <Text>
            {' '}
            •
            {errors.length}
            {' '}
            error
            {errors.length > 1 ? 's' : ''}
            {' '}
            found
          </Text>
        </Text>
      </Box>

      {/* Copy Message */}
      {copyMessage && (
        <Box marginTop={1} borderStyle="single" borderColor="green" paddingX={1}>
          <Text color="green">{copyMessage}</Text>
        </Box>
      )}

      {/* Instructions */}
      <Box marginTop={1}>
        <Text dimColor>
          Use
          {' '}
          <Text color="yellow">↑↓</Text>
          {' '}
          or
          {' '}
          <Text color="yellow">
            1-
            {Math.min(maxVisibleErrors, errors.length)}
          </Text>
          {' '}
          to select •
          <Text color="yellow"> y</Text>
          {' '}
          copy line •
          <Text color="yellow"> Y</Text>
          {' '}
          copy with context •
          <Text color="yellow"> e/ESC</Text>
          {' '}
          exit
        </Text>
      </Box>

      {/* Scroll indicator - more errors above */}
      {hasMoreAbove && (
        <Box marginTop={1} borderStyle="single" borderColor="gray" paddingX={1}>
          <Text dimColor>
            ↑
            {scrollOffset}
            {' '}
            more error
            {scrollOffset > 1 ? 's' : ''}
            {' '}
            above
          </Text>
        </Box>
      )}

      {/* Error List */}
      <Box marginTop={1} flexDirection="column">
        {visibleErrors.map((error) => {
          const isSelected = selectedIndex === error.index
          const borderStyle = isSelected ? 'double' : 'round'
          const borderColor = isSelected ? 'yellow' : 'red'

          return (
            <Box key={error.id} marginBottom={1} flexDirection="column">
              <Box borderStyle={borderStyle} borderColor={borderColor} paddingX={1}>
                <Box flexDirection="column" width="100%">
                  {/* Header */}
                  <Box justifyContent="space-between">
                    <Text bold color={isSelected ? 'yellow' : 'red'}>
                      Error #
                      {error.index}
                      {isSelected && ' (SELECTED)'}
                    </Text>
                    <Text dimColor>{error.timeString}</Text>
                  </Box>

                  {/* Pod Info */}
                  <Box marginTop={0}>
                    <Text dimColor>Pod: </Text>
                    <Text color="cyan">
                      {error.pod}
                      /
                      {error.container}
                    </Text>
                    <Text dimColor> • Type: </Text>
                    <Text color="magenta">{error.errorType}</Text>
                  </Box>

                  {/* Context Before */}
                  {isSelected && error.contextBefore.length > 0 && (
                    <Box marginTop={1} flexDirection="column">
                      <Text dimColor>
                        Context (
                        {error.contextBefore.length}
                        {' '}
                        lines before):
                      </Text>
                      {error.contextBefore.map(line => (
                        <Text key={`before-${error.id}-${line.timestamp}-${line.raw.slice(0, 30)}`} dimColor>
                          {' '}
                          {line.raw}
                        </Text>
                      ))}
                    </Box>
                  )}

                  {/* Error Line */}
                  <Box marginTop={isSelected && error.contextBefore.length > 0 ? 1 : 0}>
                    <Text color="red" bold>🔴 </Text>
                    <Text>{error.coloredLine}</Text>
                  </Box>

                  {/* Stack Trace */}
                  {isSelected && error.stackTrace.length > 0 && (
                    <Box marginTop={1} flexDirection="column">
                      <Text dimColor>Stack trace:</Text>
                      {error.stackTrace.slice(0, 5).map(line => (
                        <Text key={`stack-${error.id}-${line.slice(0, 50)}`} dimColor>
                          {' '}
                          {line}
                        </Text>
                      ))}
                      {error.stackTrace.length > 5 && (
                        <Text dimColor>
                          {' '}
                          ... (
                          {error.stackTrace.length - 5}
                          {' '}
                          more lines)
                        </Text>
                      )}
                    </Box>
                  )}

                  {/* Context After */}
                  {isSelected && error.contextAfter.length > 0 && (
                    <Box marginTop={1} flexDirection="column">
                      <Text dimColor>
                        Context (
                        {error.contextAfter.length}
                        {' '}
                        lines after):
                      </Text>
                      {error.contextAfter.map(line => (
                        <Text key={`after-${error.id}-${line.timestamp}-${line.raw.slice(0, 30)}`} dimColor>
                          {' '}
                          {line.raw}
                        </Text>
                      ))}
                    </Box>
                  )}
                </Box>
              </Box>
            </Box>
          )
        })}

      </Box>

      {/* Scroll indicator - more errors below */}
      {hasMoreBelow && (
        <Box marginTop={1} borderStyle="single" borderColor="gray" paddingX={1}>
          <Text dimColor>
            ↓
            {errors.length - scrollOffset - maxVisibleErrors}
            {' '}
            more error
            {errors.length - scrollOffset - maxVisibleErrors > 1 ? 's' : ''}
            {' '}
            below
          </Text>
        </Box>
      )}

      {/* Footer */}
      <Box marginTop={1} borderStyle="single" borderColor="gray" paddingX={1}>
        <Text dimColor>
          {selectedIndex !== null
            ? `Selected: Error #${selectedIndex} • Press y (copy) or Y (copy with context)`
            : 'Press 1-9 to select an error'}
        </Text>
      </Box>
    </Box>
  )
}

// Export methods for parent to call
export { ErrorMode }
