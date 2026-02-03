import { Box, Text } from 'ink'
import SelectInput from 'ink-select-input'
import Spinner from 'ink-spinner'
import * as React from 'react'

interface NamespaceOverlayProps {
  namespaces: string[]
  onSelect: (value: string) => void
  onHighlight: (value: string) => void
  isLoading: boolean
  error: string | null
  searchText: string
  message: string | null
  listLimit: number
}

export default function NamespaceOverlay({
  namespaces,
  onSelect,
  onHighlight,
  isLoading,
  error,
  searchText,
  message,
  listLimit,
}: NamespaceOverlayProps) {
  if (isLoading) {
    return (
      <Text color="green">
        <Spinner type="dots" />
        {' '}
        Loading namespaces...
      </Text>
    )
  }
  if (error) {
    return (
      <Box flexDirection="column">
        <Text color="red">
          Error:
          {error}
        </Text>
        <Text dimColor>Press Esc to cancel</Text>
      </Box>
    )
  }

  const items = namespaces.map(ns => ({ label: ns, value: ns }))

  return (
    <Box flexDirection="column">
      <Box borderStyle="double" borderColor="yellow" paddingX={1}><Text>Select Namespace</Text></Box>
      <Box marginBottom={1}>
        <Text>
          Search:
          <Text color="yellow">{searchText}</Text>
          {searchText ? '_' : ''}
        </Text>
      </Box>
      {message && <Text color="green" bold>{message}</Text>}
      <SelectInput
        items={items}
        onSelect={item => onSelect(item.value)}
        onHighlight={item => onHighlight(item.value)}
        limit={listLimit}
      />
      <Box marginTop={1}>
        <Text dimColor>
          <Text color="yellow">Enter</Text>
          {' '}
          select |
          <Text color="yellow">Ctrl+S</Text>
          {' '}
          set default |
          <Text color="yellow">Esc</Text>
          {' '}
          cancel
        </Text>
      </Box>
    </Box>
  )
}
