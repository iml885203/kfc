import type { Layer } from '../hooks/useK8sContext.js'
import { useStdout } from 'ink'
import * as React from 'react'
import { useDeploymentSelectorLogic } from '../hooks/useDeploymentSelectorLogic.js'
import ContextSelector from './ContextSelector.js'
import DeploymentList from './DeploymentList.js'
import NamespaceOverlay from './NamespaceOverlay.js'

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

  const {
    searchText,
    setHighlightedNamespace,
    message,
    filteredContexts,
    filteredNamespaces,
    filteredDeployments,
  } = useDeploymentSelectorLogic({
    layer,
    contexts,
    namespaces,
    deployments,
    isSelectingNamespace,
    setIsSelectingNamespace,
    setLayer,
    onExit,
  })

  // Render Helpers
  const height = stdout?.rows || 20
  const listLimit = Math.max(5, height - 7)

  // 1. Context Selection
  if (layer === 'context') {
    return (
      <ContextSelector
        contexts={filteredContexts}
        onSelect={setSelectedContext}
        isLoading={isLoading}
        error={error}
        searchText={searchText}
        listLimit={listLimit}
      />
    )
  }

  // 2. Deployment Selection (+ Namespace Overlay)
  if (layer === 'deployment') {
    // Namespace Overlay
    if (isSelectingNamespace) {
      return (
        <NamespaceOverlay
          namespaces={filteredNamespaces}
          onSelect={setSelectedNamespace}
          onHighlight={setHighlightedNamespace}
          isLoading={isLoading}
          error={error}
          searchText={searchText}
          message={message}
          listLimit={listLimit}
        />
      )
    }

    // Deployment List
    return (
      <DeploymentList
        deployments={filteredDeployments}
        selectedContext={selectedContext}
        selectedNamespace={selectedNamespace}
        onSelect={setSelectedDeployment}
        isLoading={isLoading}
        error={error}
        searchText={searchText}
        listLimit={listLimit}
      />
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
