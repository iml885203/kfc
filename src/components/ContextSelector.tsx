import { Box, Text } from 'ink'
import SelectInput from 'ink-select-input'
import Spinner from 'ink-spinner'
import * as React from 'react'

interface ContextSelectorProps {
  contexts: string[]
  onSelect: (value: string) => void
  isLoading: boolean
  error: string | null
  searchText: string
  listLimit: number
}

export default function ContextSelector({
  contexts,
  onSelect,
  isLoading,
  error,
  searchText,
  listLimit,
}: ContextSelectorProps) {
  if (isLoading) {
    return (
      <Text color="green">
        <Spinner type="dots" />
        {' '}
        Loading contexts...
      </Text>
    )
  }
  if (error) {
    return (
      <Text color="red">
        Error:
        {error}
      </Text>
    )
  }

  const items = contexts.map(c => ({ label: c, value: c }))

  return (
    <Box flexDirection="column">
      <Box borderStyle="round" borderColor="blue" paddingX={1}>
        <Text>Select Kubernetes Context (Cluster)</Text>
      </Box>
      <Box marginBottom={1}>
        <Text>
          Search:
          <Text color="yellow">{searchText}</Text>
          {searchText ? '_' : ''}
        </Text>
      </Box>
      <SelectInput
        items={items}
        onSelect={item => onSelect(item.value)}
        limit={listLimit}
      />
      <Box marginTop={1}>
        <Text dimColor>
          Press
          <Text color="yellow">Enter</Text>
          {' '}
          to select,
          <Text color="yellow">Esc</Text>
          {' '}
          to exit
        </Text>
      </Box>
    </Box>
  )
}
