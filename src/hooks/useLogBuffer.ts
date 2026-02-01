/**
 * Hook for managing log buffer
 */

import { useCallback, useRef } from 'react'

export interface BufferedLine {
  podPrefix: string
  line: string
  coloredLine: string
  timestamp: number
}

export interface UseLogBufferReturn {
  buffer: React.MutableRefObject<BufferedLine[]>
  addLine: (line: BufferedLine) => void
  clear: () => void
  getSize: () => number
}

export function useLogBuffer(maxSize: number = 10000): UseLogBufferReturn {
  const buffer = useRef<BufferedLine[]>([])

  const addLine = useCallback(
    (line: BufferedLine) => {
      buffer.current.push(line)

      // Trim buffer if too large
      if (buffer.current.length > maxSize) {
        buffer.current = buffer.current.slice(-maxSize)
      }
    },
    [maxSize],
  )

  const clear = useCallback(() => {
    buffer.current = []
  }, [])

  const getSize = useCallback(() => {
    return buffer.current.length
  }, [])

  return {
    buffer,
    addLine,
    clear,
    getSize,
  }
}
