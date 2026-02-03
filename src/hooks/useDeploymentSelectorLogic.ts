import type { Layer } from './useK8sContext.js'
import { useInput } from 'ink'
import { useMemo, useState } from 'react'
import { setDefaultNamespace } from '../utils/config.js'

interface UseDeploymentSelectorLogicProps {
  layer: Layer
  contexts: string[]
  namespaces: string[]
  deployments: string[]
  isSelectingNamespace: boolean
  setIsSelectingNamespace: (val: boolean) => void
  setLayer: (layer: Layer) => void
  onExit: () => void
}

export function useDeploymentSelectorLogic({
  layer,
  contexts,
  namespaces,
  deployments,
  isSelectingNamespace,
  setIsSelectingNamespace,
  setLayer,
  onExit,
}: UseDeploymentSelectorLogicProps) {
  const [searchText, setSearchText] = useState('')
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

  return {
    searchText,
    highlightedNamespace,
    setHighlightedNamespace,
    message,
    filteredContexts,
    filteredNamespaces,
    filteredDeployments,
  }
}
