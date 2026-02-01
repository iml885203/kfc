import { Box, Text } from 'ink'
import * as React from 'react'

interface LogViewerStatusBarProps {
  isConnected: boolean
  context?: string
  namespace: string
  deployment: string
  filterPattern: string
  filterInvert: boolean
  filterIgnoreCase: boolean
  filterContext: number
  errorCount: number
  paused: boolean
  isWrap: boolean
  filterMode: boolean
  bufferLength: number
}

export default function LogViewerStatusBar({
  isConnected,
  context,
  namespace,
  deployment,
  filterPattern,
  filterInvert,
  filterIgnoreCase,
  filterContext,
  errorCount,
  paused,
  isWrap,
  filterMode,
  bufferLength,
}: LogViewerStatusBarProps) {
  const filterInfo = filterPattern
    ? ` | ${filterInvert ? 'NOT ' : ''}/${filterPattern}/${filterIgnoreCase ? 'i' : ''}${
      filterContext > 0 ? ` ±${filterContext}` : ''
    }`
    : ''

  const pauseInfo = paused ? ' [PAUSED]' : ''
  const modeInfo = filterMode ? ' [FILTER MODE]' : ''
  const wrapInfo = !isWrap ? ' [NO WRAP]' : ''
  const bufferInfo = ` (${bufferLength})`
  const errorInfo = errorCount > 0 ? ` [🔴 ${errorCount} ERROR${errorCount > 1 ? 'S' : ''}]` : ''

  return (
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
  )
}
