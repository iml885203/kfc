// @vitest-environment happy-dom
import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getDefaultNamespace, setDefaultNamespace } from '../utils/config.js'
import { useK8sContext } from './useK8sContext'

vi.mock('../utils/config.js', () => ({
  getDefaultNamespace: vi.fn(),
  setDefaultNamespace: vi.fn(),
  getLastNamespace: vi.fn(),
}))

describe('useK8sContext', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should initialize with default namespace from config if available', () => {
    (getDefaultNamespace as any).mockReturnValue('stored-ns')

    const { result } = renderHook(() => useK8sContext({}))

    expect(result.current.selectedNamespace).toBe('stored-ns')
  })

  it('should prefer stored config when no namespace is provided (fix for the issue)', () => {
    (getDefaultNamespace as any).mockReturnValue('stored-ns')

    // After fix in cli.tsx, no flag provided results in undefined initialNamespace
    const { result } = renderHook(() => useK8sContext({ initialNamespace: undefined }))

    expect(result.current.selectedNamespace).toBe('stored-ns')
  })

  it('should persist selected namespace to config', () => {
    const { result } = renderHook(() => useK8sContext({}))

    act(() => {
      result.current.setNamespace('new-ns')
    })

    expect(setDefaultNamespace).toHaveBeenCalledWith('new-ns')
  })

  it('should initialize with default values', () => {
    // When config is empty, should default to 'default'
    (getDefaultNamespace as any).mockReturnValue(undefined)

    const { result } = renderHook(() => useK8sContext({}))

    expect(result.current.selectedContext).toBe('')
    expect(result.current.selectedNamespace).toBe('default')
    expect(result.current.selectedDeployment).toBe('')
    expect(result.current.layer).toBe('context')
  })

  it('should initialize with provided props', () => {
    const props = {
      initialContext: 'test-ctx',
      initialNamespace: 'test-ns',
      initialDeployment: 'test-dep',
    }
    const { result } = renderHook(() => useK8sContext(props))

    expect(result.current.selectedContext).toBe('test-ctx')
    expect(result.current.selectedNamespace).toBe('test-ns')
    expect(result.current.selectedDeployment).toBe('test-dep')
    expect(result.current.layer).toBe('logs')
  })

  it('should reset to config default namespace (not hardcoded "default") when context changes', () => {
    (getDefaultNamespace as any).mockReturnValue('stored-ns')

    const { result } = renderHook(() => useK8sContext({}))

    // Initial should be stored-ns
    expect(result.current.selectedNamespace).toBe('stored-ns')

    act(() => {
      result.current.setContext('new-ctx')
    })

    // Should still be stored-ns, NOT 'default'
    expect(result.current.selectedNamespace).toBe('stored-ns')
  })

  it('should initialize into deployment layer if only context provided', () => {
    const props = { initialContext: 'test-ctx' }
    const { result } = renderHook(() => useK8sContext(props))

    expect(result.current.layer).toBe('deployment')
  })

  it('should reset downstream selection when context changes', () => {
    const props = {
      initialContext: 'old-ctx',
      initialNamespace: 'old-ns',
      initialDeployment: 'old-dep',
    }
    const { result } = renderHook(() => useK8sContext(props))

    act(() => {
      result.current.setContext('new-ctx')
    })

    expect(result.current.selectedContext).toBe('new-ctx')
    expect(result.current.selectedNamespace).toBe('old-ns') // Should reset to its initial default
    expect(result.current.selectedDeployment).toBe('')
    expect(result.current.layer).toBe('deployment')
  })

  it('should reset deployment when namespace changes', () => {
    const props = {
      initialContext: 'ctx',
      initialNamespace: 'old-ns',
      initialDeployment: 'old-dep',
    }
    const { result } = renderHook(() => useK8sContext(props))

    act(() => {
      result.current.setNamespace('new-ns')
    })

    expect(result.current.selectedNamespace).toBe('new-ns')
    expect(result.current.selectedDeployment).toBe('')
    expect(result.current.layer).toBe('deployment')
  })

  it('should set layer to logs when deployment selected', () => {
    const { result } = renderHook(() => useK8sContext({}))

    act(() => {
      result.current.setDeployment('my-dep')
    })

    expect(result.current.selectedDeployment).toBe('my-dep')
    expect(result.current.layer).toBe('logs')
  })

  it('should allow manual layer navigation', () => {
    const { result } = renderHook(() => useK8sContext({}))

    act(() => {
      result.current.setLayer('deployment')
    })
    expect(result.current.layer).toBe('deployment')
  })
})
