import { Box, Text } from 'ink'
import SelectInput from 'ink-select-input'
import Spinner from 'ink-spinner'
import * as React from 'react'

interface DeploymentListProps {
  deployments: string[]
  selectedContext: string
  selectedNamespace: string
  onSelect: (value: string) => void
  isLoading: boolean
  error: string | null
  searchText: string
  listLimit: number
}

export default function DeploymentList({
  deployments,
  selectedContext,
  selectedNamespace,
  onSelect,
  isLoading,
  error,
  searchText,
  listLimit,
}: DeploymentListProps) {
  const items = deployments.map(d => ({ label: d, value: d }))

  return (
    <Box flexDirection="column">
      <Box borderStyle="round" borderColor="cyan" paddingX={1} flexDirection="row" justifyContent="space-between">
        <Text>
          Context:
          {' '}
          <Text color="blue">{selectedContext || 'current'}</Text>
          {' '}
          |
          Namespace:
          {' '}
          <Text color="yellow">{selectedNamespace}</Text>
        </Text>
      </Box>

      {isLoading
        ? (
            <Text>
              <Spinner type="dots" />
              {' '}
              Loading deployments...
            </Text>
          )
        : error
          ? (
              <Text color="red">
                Error:
                {error}
              </Text>
            )
          : (
              <Box flexDirection="column">
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
              </Box>
            )}

      <Box marginTop={1}>
        <Text dimColor>
          <Text color="yellow">Enter</Text>
          {' '}
          select |
          <Text color="yellow">Ctrl+N</Text>
          {' '}
          switch namespace |
          <Text color="yellow">Esc</Text>
          {' '}
          back
        </Text>
      </Box>
    </Box>
  )
}
