import { Box, Text } from 'ink'
import * as React from 'react'

export default function LogViewerHelp() {
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
          <Text color="yellow" bold>↑↓ or 1-9</Text>
          {' '}
          Navigate/select errors (in error mode)
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
          <Text color="yellow" bold>d</Text>
          {' '}
          Toggle pod/container prefix display
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
