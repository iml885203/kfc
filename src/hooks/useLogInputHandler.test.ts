// @vitest-environment happy-dom
import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useLogInputHandler } from './useLogInputHandler'

describe('useLogInputHandler', () => {
  const mockUseInput = vi.fn()
  const mockExit = vi.fn()
  const mockWrite = vi.fn()
  const mockCopyToClipboard = vi.fn()
  const mockOnBack = vi.fn()

  const mockDisplayState = {
    filterMode: false,
    paused: false,
    isWrap: true,
    isShowingHelp: false,
    showPodPrefix: false,
    setFilterMode: vi.fn(),
    setPaused: vi.fn(),
    setIsWrap: vi.fn(),
    setIsShowingHelp: vi.fn(),
    setShowPodPrefix: vi.fn(),
  }

  const mockFilter = {
    pattern: '',
    ignoreCase: false,
    invert: false,
    context: 0,
    setPattern: vi.fn(),
    clearFilter: vi.fn(),
    toggleIgnoreCase: vi.fn(),
    toggleInvert: vi.fn(),
    increaseContext: vi.fn(),
    decreaseContext: vi.fn(),
  }

  const mockBuffer = {
    current: [],
    addLine: vi.fn(),
    clear: vi.fn(),
  }

  const mockErrorCollection = {
    errors: [],
    errorCount: 0,
    getError: vi.fn(),
    clearErrors: vi.fn(),
  }

  const defaultProps = {
    useInputHook: mockUseInput,
    exit: mockExit,
    write: mockWrite,
    copyToClipboard: mockCopyToClipboard,
    onBack: mockOnBack,
    displayState: mockDisplayState,
    filter: mockFilter as any,
    buffer: mockBuffer as any,
    errorCollection: mockErrorCollection as any,
    isConnected: true,
    errorMode: false,
    setErrorMode: vi.fn(),
    selectedErrorIndex: null,
    setSelectedErrorIndex: vi.fn(),
    errorScrollOffset: 0,
    setErrorScrollOffset: vi.fn(),
    setCopyMessage: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockDisplayState.filterMode = false
  })

  it('should register input handler', () => {
    renderHook(() => useLogInputHandler(defaultProps))
    expect(mockUseInput).toHaveBeenCalled()
  })

  // Test cases for normal mode
  it('should toggle pause when p is pressed', () => {
    // default paused is false
    renderHook(() => useLogInputHandler(defaultProps))
    const handler = mockUseInput.mock.calls[0][0]

    act(() => {
      handler('p', {})
    })
    expect(mockDisplayState.setPaused).toHaveBeenCalledWith(true)
  })

  it('should clear buffer when x is pressed', () => {
    renderHook(() => useLogInputHandler(defaultProps))
    const handler = mockUseInput.mock.calls[0][0]

    act(() => {
      handler('x', {})
    })
    expect(mockBuffer.clear).toHaveBeenCalled()
    expect(mockErrorCollection.clearErrors).toHaveBeenCalled()
  })

  it('should toggle pod prefix when d is pressed', () => {
    renderHook(() => useLogInputHandler(defaultProps))
    const handler = mockUseInput.mock.calls[0][0]

    act(() => {
      handler('d', {})
    })
    expect(mockDisplayState.setShowPodPrefix).toHaveBeenCalledWith(true)
  })

  // Test cases for filter mode
  it('should update filter pattern in filter mode', () => {
    mockDisplayState.filterMode = true
    renderHook(() => useLogInputHandler({ ...defaultProps, displayState: mockDisplayState }))
    const handler = mockUseInput.mock.calls[0][0]

    act(() => {
      handler('a', {})
    })
    expect(mockDisplayState.setFilterMode).not.toHaveBeenCalledWith(false) // Should stay in filter mode
    // Note: state update is internal to hook usually, but here we expect filter to be updated on Enter
  })

  it('should apply filter on Enter in filter mode', () => {
    mockDisplayState.filterMode = true

    // Capture the latest handler
    let latestHandler: any
    mockUseInput.mockImplementation((cb) => {
      latestHandler = cb
    })

    renderHook(() => useLogInputHandler({ ...defaultProps, displayState: mockDisplayState }))

    // Initial handler
    expect(latestHandler).toBeDefined()

    act(() => {
      latestHandler('abc', {})
    })

    // Re-render happens, latestHandler should be updated if the hook re-runs useInput
    // useInput(cb) is called every render in the hook because cb is an arrow function

    act(() => {
      latestHandler('', { return: true })
    })

    expect(mockFilter.setPattern).toHaveBeenCalledWith('abc')
    expect(mockDisplayState.setFilterMode).toHaveBeenCalledWith(false)
  })
})
