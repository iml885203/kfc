import { useCallback, useState } from 'react'
import { getDefaultNamespace, setDefaultNamespace as saveDefaultNamespace } from '../utils/config.js'

export type Layer = 'context' | 'deployment' | 'logs'

interface UseK8sContextProps {
  initialContext?: string
  initialNamespace?: string
  initialDeployment?: string
}

export function useK8sContext({
  initialContext,
  initialNamespace,
  initialDeployment,
}: UseK8sContextProps) {
  // Determine initial layer
  const getInitialLayer = (): Layer => {
    if (initialDeployment)
      return 'logs'
    if (initialContext)
      return 'deployment'
    return 'context'
  }

  const [layer, setLayer] = useState<Layer>(getInitialLayer)

  const [selectedContext, setSelectedContext] = useState<string>(initialContext || '')

  // Default namespace logic similar to original App.tsx
  // We prioritize prop -> config -> 'default'
  const [selectedNamespace, setSelectedNamespace] = useState<string>(
    () => initialNamespace || getDefaultNamespace() || 'default',
  )

  const [selectedDeployment, setSelectedDeployment] = useState<string>(initialDeployment || '')

  const setContext = useCallback((ctx: string) => {
    setSelectedContext(ctx)
    // Use the same logic as initialization: priority to initial prop, then config, then hardcoded 'default'
    setSelectedNamespace(initialNamespace || getDefaultNamespace() || 'default')
    setSelectedDeployment('')
    setLayer('deployment')
  }, [initialNamespace])

  const setNamespace = useCallback((ns: string) => {
    setSelectedNamespace(ns)
    saveDefaultNamespace(ns)
    // Reset downstream
    setSelectedDeployment('')
    // Ideally stay in deployment layer to select deployment
    setLayer('deployment')
  }, [])

  const setDeployment = useCallback((dep: string) => {
    setSelectedDeployment(dep)
    setLayer('logs')
  }, [])

  return {
    selectedContext,
    selectedNamespace,
    selectedDeployment,
    layer,
    setContext,
    setNamespace,
    setDeployment,
    setLayer,
  }
}
