import { cleanup, render } from 'ink-testing-library'
import * as React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import DeploymentSelector from './DeploymentSelector'

describe('deploymentSelector', () => {
  const defaultProps = {
    layer: 'context' as const,
    contexts: ['ctx-1', 'ctx-2', 'prod-ctx'],
    namespaces: ['default', 'kube-system'],
    deployments: ['dep-1', 'dep-2', 'api-server'],
    selectedContext: '',
    selectedNamespace: 'default',
    setSelectedContext: vi.fn(),
    setSelectedNamespace: vi.fn(),
    setSelectedDeployment: vi.fn(),
    setLayer: vi.fn(),
    isLoading: false,
    error: null,
    onExit: vi.fn(),
    isSelectingNamespace: false,
    setIsSelectingNamespace: vi.fn(),
  }

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('renders context list initially', () => {
    const { lastFrame } = render(<DeploymentSelector {...defaultProps} />)
    const output = lastFrame()
    expect(output).toContain('Select Kubernetes Context')
    expect(output).toContain('ctx-1')
    expect(output).toContain('prod-ctx')
  })

  it('filters contexts when typing', async () => {
    const { lastFrame, stdin } = render(<DeploymentSelector {...defaultProps} />)

    // Type 'prod'
    await stdin.write('prod')

    // Wait for the UI to update
    await new Promise(resolve => setTimeout(resolve, 50))

    const output = lastFrame()
    expect(output).toContain('prod-ctx')
    expect(output).not.toContain('ctx-1')
    expect(output).toContain('Search:')
    expect(output).toContain('prod')
  })

  it('selects context on Enter', async () => {
    const setSelectedContext = vi.fn()
    const { stdin } = render(
      <DeploymentSelector
        {...defaultProps}
        setSelectedContext={setSelectedContext}
      />,
    )

    // Default selection should be first item 'ctx-1'
    await stdin.write('\r') // Enter
    await new Promise(resolve => setTimeout(resolve, 50))

    expect(setSelectedContext).toHaveBeenCalledWith('ctx-1')
  })

  it('renders deployment list when layer is deployment', () => {
    const { lastFrame } = render(
      <DeploymentSelector
        {...defaultProps}
        layer="deployment"
        selectedContext="ctx-1"
      />,
    )

    const output = lastFrame()
    expect(output).not.toContain('Select Kubernetes Context')
    // It shows context info bar instead
    expect(output).toContain('Context:')
    expect(output).toContain('ctx-1')
    expect(output).toContain('dep-1')
    expect(output).toContain('api-server')
  })

  it('filters deployments when typing', async () => {
    const { lastFrame, stdin } = render(
      <DeploymentSelector
        {...defaultProps}
        layer="deployment"
      />,
    )

    await stdin.write('api')
    await new Promise(resolve => setTimeout(resolve, 50))

    const output = lastFrame()
    expect(output).toContain('api-server')
    expect(output).not.toContain('dep-1')
  })

  it('enters namespace selection mode on Ctrl+N', async () => {
    const setIsSelectingNamespace = vi.fn()
    const { stdin } = render(
      <DeploymentSelector
        {...defaultProps}
        layer="deployment"
        setIsSelectingNamespace={setIsSelectingNamespace}
      />,
    )

    // Ctrl+N is usually represented as \x0E
    await stdin.write('\x0E')

    expect(setIsSelectingNamespace).toHaveBeenCalledWith(true)
  })

  it('renders namespace list when selecting namespace', () => {
    const { lastFrame } = render(
      <DeploymentSelector
        {...defaultProps}
        layer="deployment"
        isSelectingNamespace={true}
      />,
    )

    const output = lastFrame()
    expect(output).toContain('Select Namespace')
    expect(output).toContain('default')
    expect(output).toContain('kube-system')
  })

  it('selects namespace on Enter', async () => {
    const setSelectedNamespace = vi.fn()
    const { stdin } = render(
      <DeploymentSelector
        {...defaultProps}
        layer="deployment"
        isSelectingNamespace={true}
        setSelectedNamespace={setSelectedNamespace}
      />,
    )

    // Default 'default'
    await stdin.write('\r')

    expect(setSelectedNamespace).toHaveBeenCalledWith('default')
  })

  it('handles Escape key to go back from Context layer', async () => {
    const onExit = vi.fn()
    const { stdin } = render(
      <DeploymentSelector
        {...defaultProps}
        layer="context"
        onExit={onExit}
      />,
    )

    await stdin.write('\x1B') // Escape

    expect(onExit).toHaveBeenCalled()
  })

  it('handles Escape key to go back from Deployment layer', async () => {
    const setLayer = vi.fn()
    const { stdin } = render(
      <DeploymentSelector
        {...defaultProps}
        layer="deployment"
        setLayer={setLayer}
      />,
    )

    await stdin.write('\x1B')

    expect(setLayer).toHaveBeenCalledWith('context')
  })

  it('handles Escape key to exit Namespace selection', async () => {
    const setIsSelectingNamespace = vi.fn()
    const { stdin } = render(
      <DeploymentSelector
        {...defaultProps}
        layer="deployment"
        isSelectingNamespace={true}
        setIsSelectingNamespace={setIsSelectingNamespace}
      />,
    )

    await stdin.write('\x1B')

    expect(setIsSelectingNamespace).toHaveBeenCalledWith(false)
  })
})
