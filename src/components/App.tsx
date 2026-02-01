import type { ErrorDetector } from '../utils/errorDetector.js'
import { useApp } from 'ink'
import * as React from 'react'
import { useState } from 'react'
import { useK8sContext } from '../hooks/useK8sContext.js'
import { useK8sDiscovery } from '../hooks/useK8sDiscovery.js'
import DeploymentSelector from './DeploymentSelector.js'
import LogViewer from './LogViewer.js'

interface AppProps {
  deploymentName?: string
  namespace: string
  context?: string
  tail: number
  maxRetry: number
  timeout: number
  grepPattern?: string
  grepAfter?: number
  grepBefore?: number
  grepContext?: number
  grepIgnoreCase?: boolean
  grepInvert?: boolean
  errorDetector?: ErrorDetector
}

export default function App({
  deploymentName: initialDeployment,
  namespace: initialNamespace,
  context: initialContext,
  tail,
  maxRetry,
  timeout,
  grepPattern,
  grepAfter = 0,
  grepBefore = 0,
  grepContext = 0,
  grepIgnoreCase = false,
  grepInvert = false,
  errorDetector,
}: AppProps) {
  const { exit } = useApp()

  // 1. Core State & Navigation (Logic Layer)
  const {
    selectedContext,
    selectedNamespace,
    selectedDeployment,
    layer,
    setContext,
    setNamespace,
    setDeployment,
    setLayer,
  } = useK8sContext({
    initialContext,
    initialNamespace,
    initialDeployment,
  })

  // UI State that affects fetching (Selecting Namespace Overlay)
  // This state is shared between UI (Selector) and Data (Discovery)
  const [isSelectingNamespace, setIsSelectingNamespace] = useState(false)

  // 2. Data Discovery (Application Layer)
  const {
    contexts,
    namespaces,
    deployments,
    isLoading,
    error,
  } = useK8sDiscovery({
    layer,
    selectedContext,
    selectedNamespace,
    isSelectingNamespace,
  })

  // 3. Render (Interface Layer)
  if (layer === 'logs') {
    return (
      <LogViewer
        deployment={selectedDeployment}
        namespace={selectedNamespace}
        context={selectedContext}
        tail={tail}
        maxRetry={maxRetry}
        timeout={timeout}
        grepPattern={grepPattern}
        grepAfter={grepAfter}
        grepBefore={grepBefore}
        grepContext={grepContext}
        grepIgnoreCase={grepIgnoreCase}
        grepInvert={grepInvert}
        onBack={() => {
          setLayer('deployment')
          // Reset deployment to allow re-selection?
          // setDeployment('') // Maybe? If we go back, we probably want to select another.
        }}
        errorDetector={errorDetector}
      />
    )
  }

  return (
    <DeploymentSelector
      key={layer}
      layer={layer}
      contexts={contexts}
      namespaces={namespaces}
      deployments={deployments}
      selectedContext={selectedContext}
      selectedNamespace={selectedNamespace}
      setSelectedContext={setContext}
      setSelectedNamespace={(ns) => {
        setNamespace(ns)
        setIsSelectingNamespace(false)
      }}
      setSelectedDeployment={setDeployment}
      setLayer={setLayer}
      isLoading={isLoading}
      error={error}
      onExit={exit}
      isSelectingNamespace={isSelectingNamespace}
      setIsSelectingNamespace={setIsSelectingNamespace}
    />
  )
}
