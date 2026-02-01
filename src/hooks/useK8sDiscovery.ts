import type { Layer } from './useK8sContext.js'
import { useCallback, useEffect, useState } from 'react'
import { getContexts, getCurrentContext, getDeployments, getNamespaces } from '../k8s/client.js'
import { getCachedDeployments, setCachedDeployments } from '../utils/cache.js'

interface UseK8sDiscoveryProps {
  layer: Layer
  selectedContext: string
  selectedNamespace: string
  isSelectingNamespace?: boolean
}

export function useK8sDiscovery({
  layer,
  selectedContext,
  selectedNamespace,
  isSelectingNamespace = false,
}: UseK8sDiscoveryProps) {
  const [contexts, setContexts] = useState<string[]>([])
  const [namespaces, setNamespaces] = useState<string[]>([])
  const [deployments, setDeployments] = useState<string[]>([])

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadContexts = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      const ctxs = getContexts()
      setContexts(ctxs)

      // If no context selected, maybe try to load current?
      // This logic was in App.tsx but simplified here for hook responsibility.
    }
    catch (err) {
      setError(`Failed to load contexts: ${err instanceof Error ? err.message : String(err)}`)
    }
    finally {
      setIsLoading(false)
    }
  }, [])

  const loadNamespaces = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      const nss = await getNamespaces(selectedContext || undefined)
      setNamespaces(nss)
    }
    catch (err) {
      setError(`Failed to load namespaces: ${err instanceof Error ? err.message : String(err)}`)
    }
    finally {
      setIsLoading(false)
    }
  }, [selectedContext])

  const loadDeployments = useCallback(async () => {
    // If we're selecting namespace, don't load deployments?
    // App.tsx loaded deployments unless we were purely in namespace selection mode?
    // Actually App.tsx loaded deployments if layer === 'deployment'.

    let active = true
    const ctx = selectedContext || getCurrentContext()
    const ns = selectedNamespace

    // 1. Try Cache
    const cached = getCachedDeployments(ctx, ns)
    if (cached && cached.length > 0) {
      setDeployments(cached)
      setIsLoading(false)
    }
    else {
      setIsLoading(true)
      setDeployments([])
    }
    setError(null)

    // 2. Background Sync
    try {
      const deps = await getDeployments(ns, selectedContext || undefined)

      if (active) {
        setCachedDeployments(ctx, ns, deps)
        setDeployments(deps)
        setIsLoading(false)

        if (deps.length === 0) {
          setError(`No deployments found in namespace "${ns}"`)
        }
      }
    }
    catch (err) {
      if (active) {
        const currentDeployments = getCachedDeployments(ctx, ns)
        if ((!currentDeployments || currentDeployments.length === 0) && (!cached || cached.length === 0)) {
          setError(`Failed to load deployments: ${err instanceof Error ? err.message : String(err)}`)
        }
        setIsLoading(false)
      }
    }

    return () => {
      active = false
    }
  }, [selectedContext, selectedNamespace])

  // Effect: Load Contexts
  useEffect(() => {
    if (layer === 'context') {
      loadContexts()
    }
  }, [layer, loadContexts])

  // Effect: Load Namespaces
  useEffect(() => {
    if (isSelectingNamespace) {
      loadNamespaces()
    }
  }, [isSelectingNamespace, loadNamespaces])

  // Effect: Load Deployments
  useEffect(() => {
    if (layer === 'deployment' && !isSelectingNamespace) {
      loadDeployments()
    }
  }, [layer, isSelectingNamespace, loadDeployments])

  return {
    contexts,
    namespaces,
    deployments,
    isLoading,
    error,
    refreshContexts: loadContexts,
    refreshNamespaces: loadNamespaces,
    refreshDeployments: loadDeployments,
  }
}
