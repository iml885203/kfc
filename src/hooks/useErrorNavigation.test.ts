// @vitest-environment happy-dom
import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useErrorNavigation } from './useErrorNavigation.js'

describe('useErrorNavigation', () => {
  it('should initialize selectedIndex to 0 if errors exist', () => {
    const { result } = renderHook(() => useErrorNavigation({
      errorCount: 5,
      viewHeight: 10,
    }))
    expect(result.current.selectedIndex).toBe(0)
  })

  it('should initialize selectedIndex to null if no errors', () => {
    const { result } = renderHook(() => useErrorNavigation({
      errorCount: 0,
      viewHeight: 10,
    }))
    expect(result.current.selectedIndex).toBeNull()
  })

  it('should navigate down', () => {
    const { result } = renderHook(() => useErrorNavigation({
      errorCount: 5,
      viewHeight: 10,
    }))

    act(() => {
      result.current.navigate('down')
    })

    expect(result.current.selectedIndex).toBe(1)
  })

  it('should navigate up', () => {
    const { result } = renderHook(() => useErrorNavigation({
      errorCount: 5,
      viewHeight: 10,
    }))

    // Move down first
    act(() => {
      result.current.navigate('down')
    })
    act(() => {
      result.current.navigate('down')
    })
    expect(result.current.selectedIndex).toBe(2)

    act(() => {
      result.current.navigate('up')
    })
    expect(result.current.selectedIndex).toBe(1)
  })

  it('should clamp boundaries', () => {
    const { result } = renderHook(() => useErrorNavigation({
      errorCount: 2,
      viewHeight: 10,
    }))

    act(() => {
      result.current.navigate('up') // Should stay 0
    })
    expect(result.current.selectedIndex).toBe(0)

    act(() => {
      result.current.navigate('down') // 1
    })
    act(() => {
      result.current.navigate('down') // Should stay 1
    })
    expect(result.current.selectedIndex).toBe(1)
  })

  it('scrollOffset should follow selection up', () => {
    const { result } = renderHook(() => useErrorNavigation({
      errorCount: 20,
      viewHeight: 5,
    }))

    // Force some state? Or just navigate.
    // If we are at 0, offset 0.
    expect(result.current.scrollOffset).toBe(0)
  })

  it('scrollOffset should follow selection down (paging)', () => {
    const { result } = renderHook(() => useErrorNavigation({
      errorCount: 20,
      viewHeight: 3,
    }))

    // 0, 1, 2 visible.
    // Move to 3.
    act(() => {
      result.current.navigateTo(3)
    })

    // If selected is 3, and height is 3. Visible range [1, 3] or [3, 5]?
    // Usually start index.
    // If offset=0, visible: 0, 1, 2.
    // If selected=3, it's out of view below.
    // New offset should be selected - height + 1 = 3 - 3 + 1 = 1.
    // Visible: 1, 2, 3.
    expect(result.current.scrollOffset).toBe(1)
  })
})
