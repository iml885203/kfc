import type { ErrorEntry } from '../types/error.js'
import { Box, Text, useStdout } from 'ink'
import * as React from 'react'

interface ErrorListProps {
  errors: ErrorEntry[]
  selectedIndex: number | null
  scrollOffset: number
}

export default function ErrorList({ errors, selectedIndex, scrollOffset }: ErrorListProps) {
  const { stdout } = useStdout()
  // Need to account for ErrorMode internal overhead?
  // ErrorMode calculated viewHeight dynamically.
  // Here we just render what we are given?
  // But slice depends on viewHeight.
  // ErrorMode (parent) calculates viewHeight and passed it to useErrorNavigation logic for clamping/scrolling?
  // ScrollOffset is passed here.
  // We need to decide how many items to render starting from scrollOffset.
  // If useErrorNavigation handles the viewHeight logic, then parent (ErrorMode) should know viewHeight.
  // But ErrorList needs to know how many to show.
  // ErrorMode calculated: availableHeight = rows - overhead (~10).
  // Then maxVisibleErrors = availableHeight / 6.
  // Parent (ErrorMode) should probably slice the errors passed to ErrorList?
  // Or ErrorList takes usage of stdout?
  // Let's replicate strict logic:

  const terminalHeight = stdout?.rows || 25
  const baseOverhead = 10
  // Ideally this component should fill available space.
  // FlexGrow?
  // Use simple estimation.
  const estimatedLinesPerError = 6
  const availableHeight = Math.max(10, terminalHeight - baseOverhead)
  const maxVisibleErrors = Math.max(1, Math.floor(availableHeight / estimatedLinesPerError))

  const visibleErrors = errors.slice(scrollOffset, scrollOffset + maxVisibleErrors)
  // Logic from original ErrorMode:
  // hasMoreAbove, hasMoreBelow checking.

  const hasMoreAbove = scrollOffset > 0
  const hasMoreBelow = scrollOffset + maxVisibleErrors < errors.length

  if (errors.length === 0) {
    return <Text color="gray" italic>No errors captured yet.</Text>
  }

  return (
    <Box flexDirection="column" flexGrow={1}>
      {/* Scroll indicator - more errors above */}
      {hasMoreAbove && (
        <Box marginTop={1} borderStyle="single" borderColor="gray" paddingX={1}>
          <Text dimColor>
            ↑
            {' '}
            {scrollOffset}
            {' '}
            more error
            {scrollOffset > 1 ? 's' : ''}
            {' '}
            above
          </Text>
        </Box>
      )}

      <Box flexDirection="column">
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
                      {' '}
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
            {' '}
            {errors.length - scrollOffset - maxVisibleErrors}
            {' '}
            more error
            {errors.length - scrollOffset - maxVisibleErrors > 1 ? 's' : ''}
            {' '}
            below
          </Text>
        </Box>
      )}
    </Box>
  )
}
