import type { ErrorEntry } from '../types/error.js'
import { Box, Text, useInput, useStdout } from 'ink'
import * as React from 'react'
import { useEffect } from 'react'
import { useErrorNavigation } from '../hooks/useErrorNavigation.js'
import ErrorList from './ErrorList.js'

interface ErrorModeProps {
  errors: ErrorEntry[]
  deployment: string
  namespace: string
  context?: string
  copyToClipboard: (text: string) => void
  onExit: () => void
}

export default function ErrorMode({
  errors,
  deployment,
  namespace,
  context,
  copyToClipboard,
  onExit,
}: ErrorModeProps) {
  const { stdout } = useStdout()
  const viewHeight = (stdout?.rows || 20) - 4

  const {
    selectedIndex,
    scrollOffset,
    navigate,
  } = useErrorNavigation({
    errorCount: errors.length,
    viewHeight,
  })

  const [message, setMessage] = React.useState<string | null>(null)

  // Clear message
  useEffect(() => {
    if (message) {
      const t = setTimeout(() => setMessage(null), 2000)
      return () => clearTimeout(t)
    }
  }, [message])

  useInput((input, key) => {
    if (key.upArrow)
      navigate('up')
    if (key.downArrow)
      navigate('down')
    if (key.pageUp) { /* TODO implementations in hook */ }
    if (key.pageDown) { /* TODO */ }
    if (key.home)
      navigate('home')
    if (key.end)
      navigate('end')

    if (key.escape || input === 'e') {
      onExit()
    }

    // Copy
    if (input === 'y' && selectedIndex !== null) {
      copyToClipboard(errors[selectedIndex].rawLine)
      setMessage('Copied error to clipboard')
    }
    if (input === 'Y' && selectedIndex !== null) {
      copyToClipboard(errors[selectedIndex].rawLine)
      setMessage('Copied error (context not supported in refactor yet)')
    }
  }, { isActive: true })

  return (
    <Box flexDirection="column" borderStyle="single" borderColor="red" padding={1} flexGrow={1}>
      <Box marginBottom={1} borderStyle="single" borderColor="red" borderBottom={false} borderLeft={false} borderRight={false} borderTop={false}>
        <Text bold color="red">Error Mode</Text>
        <Text>
          {' '}
          |
          {errors.length}
          {' '}
          errors found
          {' '}
          |
          {deployment}
          {' '}
          |
          {namespace}
          {' '}
          {context ? `| ${context}` : ''}
        </Text>
      </Box>

      <ErrorList
        errors={errors}
        selectedIndex={selectedIndex}
        scrollOffset={scrollOffset}
      />

      <Box marginTop={1} borderStyle="single" borderColor="gray" borderTop={true} borderBottom={false} borderLeft={false} borderRight={false}>
        {message
          ? <Text color="green">{message}</Text>
          : (
              <Text dimColor>
                Keys:
                {' '}
                <Text color="yellow">↑/↓</Text>
                {' '}
                nav |
                <Text color="yellow">y</Text>
                {' '}
                copy |
                <Text color="yellow">Esc/e</Text>
                {' '}
                exit
              </Text>
            )}
      </Box>
    </Box>
  )
}
