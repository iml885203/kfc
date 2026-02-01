// @vitest-environment happy-dom
import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useLogDisplayState } from './useLogDisplayState.js'

describe('useLogDisplayState', () => {
  it('should initialize with default values', () => {
    const { result } = renderHook(() => useLogDisplayState())

    expect(result.current.filterMode).toBe(false)
    expect(result.current.paused).toBe(false)
    expect(result.current.isWrap).toBe(true)
    expect(result.current.isShowingHelp).toBe(false)
  })

  it('should toggle states correctly', () => {
    const { result } = renderHook(() => useLogDisplayState())

    act(() => {
      result.current.setPaused(true)
    })
    expect(result.current.paused).toBe(true)

    act(() => {
      result.current.setIsWrap(false)
    })
    expect(result.current.isWrap).toBe(false)

    act(() => {
      result.current.setIsShowingHelp(true)
    })
    expect(result.current.isShowingHelp).toBe(true)

    act(() => {
      result.current.setFilterMode(true)
    })
    expect(result.current.filterMode).toBe(true)
  })
})
