import type { Layer } from '../hooks/useK8sContext.js'
import { Box, Text, useInput, useStdout } from 'ink'
import SelectInput from 'ink-select-input'
import Spinner from 'ink-spinner'
import * as React from 'react'
import { useMemo, useState } from 'react'
import { setDefaultNamespace } from '../utils/config.js'

interface DeploymentSelectorProps {
  layer: Layer
  contexts: string[]
  namespaces: string[]
  deployments: string[]
  selectedContext: string
  selectedNamespace: string
  setSelectedContext: (ctx: string) => void
  setSelectedNamespace: (ns: string) => void
  setSelectedDeployment: (dep: string) => void
  setLayer: (layer: Layer) => void
  isLoading: boolean
  error: string | null
  onExit: () => void
  isSelectingNamespace: boolean
  setIsSelectingNamespace: (val: boolean) => void
}

export default function DeploymentSelector({
  layer,
  contexts,
  namespaces,
  deployments,
  selectedContext,
  selectedNamespace,
  setSelectedContext,
  setSelectedNamespace,
  setSelectedDeployment,
  setLayer,
  isLoading,
  error,
  onExit,
  isSelectingNamespace,
  setIsSelectingNamespace,
}: DeploymentSelectorProps) {
  const { stdout } = useStdout()
  const [searchText, setSearchText] = useState('')
  // Internal state removed in favor of props
  const [highlightedNamespace, setHighlightedNamespace] = useState<string>('')
  const [message, setMessage] = useState<string | null>(null)

  // Filter Data
  const filteredContexts = useMemo(() =>
    contexts.filter(c => c.toLowerCase().includes(searchText.toLowerCase())), [contexts, searchText])

  const filteredNamespaces = useMemo(() =>
    namespaces.filter(ns => ns.toLowerCase().includes(searchText.toLowerCase())), [namespaces, searchText])

  const filteredDeployments = useMemo(() =>
    deployments.filter(d => d.toLowerCase().includes(searchText.toLowerCase())), [deployments, searchText])

  // Input Handling
  useInput((input, key) => {
    // Escape Handling
    if (key.escape) {
      if (isSelectingNamespace) {
        setIsSelectingNamespace(false)
        return
      }
      if (searchText) {
        setSearchText('')
        return
      }
      if (layer === 'deployment') {
        setLayer('context')
        return
      }
      if (layer === 'context') {
        onExit()
        return
      }
    }

    // Ctrl+N to switch namespace in deployment view
    if (layer === 'deployment' && !isSelectingNamespace && (key.ctrl && input === 'n')) {
      setIsSelectingNamespace(true)
      return
    }

    // Ctrl+S to set default namespace
    if (key.ctrl && input === 's' && isSelectingNamespace) {
      const target = highlightedNamespace || (filteredNamespaces.length > 0 ? filteredNamespaces[0] : '')
      if (target) {
        setDefaultNamespace(target)
        setMessage(`Default namespace set to '${target}'`)
        setTimeout(() => setMessage(null), 3000)
      }
      return
    }

    // Search Text Edit
    if (key.delete || key.backspace) {
      if (key.meta) {
        // Meta+Backspace: Remove last word
        setSearchText((prev) => {
          const words = prev.trimEnd().split(' ')
          words.pop()
          return words.join(' ') + (words.length > 0 ? ' ' : '')
        })
        return
      }
      setSearchText(prev => prev.slice(0, -1))
      return
    }

    // Clear Line
    if (key.ctrl && (input === 'u' || key.delete || key.backspace)) {
      setSearchText('')
      return
    }

    // Add Char
    if (input && !key.ctrl && !key.meta && !key.upArrow && !key.downArrow && !key.return && !key.escape && !key.tab) {
      setSearchText(prev => prev + input)
    }
  }, { isActive: true })

  // Render Helpers
  const height = stdout?.rows || 20
  const listLimit = Math.max(5, height - 7)

  // 1. Context Selection
  if (layer === 'context') {
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

    const items = filteredContexts.map(c => ({ label: c, value: c }))
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
          onSelect={item => setSelectedContext(item.value)}
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

  // 2. Deployment Selection (+ Namespace Overlay)
  if (layer === 'deployment') {
    // Namespace Overlay
    if (isSelectingNamespace) {
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

      const items = filteredNamespaces.map(ns => ({ label: ns, value: ns }))
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
            onSelect={(item) => {
              setSelectedNamespace(item.value)
            }}
            onHighlight={item => setHighlightedNamespace(item.value)}
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

    // Deployment List
    const items = filteredDeployments.map(d => ({ label: d, value: d }))
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
                  <SelectInput items={items} onSelect={item => setSelectedDeployment(item.value)} limit={listLimit} />
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

  return null
}

// Note: Ensure `App.tsx` handles passing `isSelectingNamespaceOverride` state?
// No, I moved `isSelectingNamespaceOverride` INSIDE this component.
// But `useK8sDiscovery` needs to know if we are selecting namespace to load namespaces!
// Ah.
// UseK8sDiscovery took `isSelectingNamespace` as a prop.
// If I move the state inside DeploymentSelector, the hook (in App.tsx) won't know.
// Solution: Lift `isSelectingNamespace` state up to App.tsx?
// Or: Pass a callback "onStartSelectingNamespace" to App.tsx?
// "isSelectingNamespace" is logical state that affects data fetching.
// Yes, I should lift `isSelectingNamespace` to App.tsx (or pass it down from App.tsx).
// I will create `isSelectingNamespace` in App.tsx and pass it down.
