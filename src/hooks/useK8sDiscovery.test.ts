// @vitest-environment happy-dom
import { renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import * as client from '../k8s/client.js'
import * as cache from '../utils/cache.js'
import { useK8sDiscovery } from './useK8sDiscovery.js'

// Mock dependencies
vi.mock('../k8s/client.js', () => ({
  getContexts: vi.fn(),
  getNamespaces: vi.fn(),
  getDeployments: vi.fn(),
  getCurrentContext: vi.fn(),
}))

vi.mock('../utils/cache.js', () => ({
  getCachedDeployments: vi.fn(),
  setCachedDeployments: vi.fn(),
}))

describe('useK8sDiscovery', () => {
  it('should fetch contexts on loading', async () => {
    vi.mocked(client.getContexts).mockReturnValue(['ctx1', 'ctx2'])

    const { result } = renderHook(() => useK8sDiscovery({
      layer: 'context',
      selectedContext: '',
      selectedNamespace: 'default',
    }))

    // Wait for effect
    await waitFor(() => {
      expect(result.current.contexts).toEqual(['ctx1', 'ctx2'])
      expect(result.current.isLoading).toBe(false)
    })
  })

  it('should fetch namespaces when selecting namespace', async () => {
    vi.mocked(client.getNamespaces).mockResolvedValue(['default', 'kube-system'])

    const { result } = renderHook(() => useK8sDiscovery({
      layer: 'deployment',
      selectedContext: 'ctx1',
      selectedNamespace: 'default',
      isSelectingNamespace: true,
    }))

    await waitFor(() => {
      expect(result.current.namespaces).toEqual(['default', 'kube-system'])
    })

    expect(client.getNamespaces).toHaveBeenCalledWith('ctx1')
  })

  it('should fetch deployments when in deployment layer', async () => {
    vi.mocked(client.getDeployments).mockResolvedValue(['dep1', 'dep2'])
    vi.mocked(cache.getCachedDeployments).mockReturnValue([])

    const { result } = renderHook(() => useK8sDiscovery({
      layer: 'deployment',
      selectedContext: 'ctx1',
      selectedNamespace: 'default',
    }))

    await waitFor(() => {
      expect(result.current.deployments).toEqual(['dep1', 'dep2'])
    })

    expect(client.getDeployments).toHaveBeenCalledWith('default', 'ctx1')
  })

  it('should handle errors gracefully', async () => {
    vi.mocked(client.getContexts).mockImplementation(() => {
      throw new Error('Failed to load')
    })

    const { result } = renderHook(() => useK8sDiscovery({
      layer: 'context',
      selectedContext: '',
      selectedNamespace: '',
    }))

    await waitFor(() => {
      expect(result.current.error).toContain('Failed to load')
    })
  })
})
