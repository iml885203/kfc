import { useCallback, useState } from 'react'

interface UseErrorNavigationProps {
  errorCount: number
  viewHeight?: number
}

type Direction = 'up' | 'down' | 'home' | 'end'

export function useErrorNavigation({
  errorCount,
  viewHeight = 10,
}: UseErrorNavigationProps) {
  // Initialize assuming if we have errors, we select the first one immediately
  const [selectedIndex, setSelectedIndex] = useState<number | null>(() => errorCount > 0 ? 0 : null)
  const [scrollOffset, setScrollOffset] = useState(0)

  // Auto-select first item if errors appear and nothing is selected
  // Derived state pattern: Update state during render if mismatch
  if (errorCount > 0 && selectedIndex === null) {
    setSelectedIndex(0)
  }
  else if (errorCount === 0 && selectedIndex !== null) {
    setSelectedIndex(null)
  }

  const navigateTo = useCallback((index: number) => {
    if (errorCount === 0)
      return
    const newIndex = Math.max(0, Math.min(index, errorCount - 1))
    setSelectedIndex(newIndex)

    // Update scroll offset
    // Ensure selected is visible
    if (newIndex < scrollOffset) {
      setScrollOffset(newIndex)
    }
    else if (newIndex >= scrollOffset + viewHeight) {
      // e.g. viewHeight=3. offset=0. visible=[0,1,2]. newIndex=3.
      // 3 >= 0+3 (true).
      // newOffset = 3 - 3 + 1 = 1. visible=[1,2,3].
      setScrollOffset(newIndex - viewHeight + 1)
    }
  }, [errorCount, scrollOffset, viewHeight])

  const navigate = useCallback((direction: Direction) => {
    if (selectedIndex === null)
      return

    switch (direction) {
      case 'up':
        navigateTo(selectedIndex - 1)
        break
      case 'down':
        navigateTo(selectedIndex + 1)
        break
      case 'home':
        navigateTo(0)
        break
      case 'end':
        navigateTo(errorCount - 1)
        break
    }
  }, [selectedIndex, errorCount, navigateTo])

  return {
    selectedIndex,
    scrollOffset,
    navigate,
    navigateTo,
  }
}
