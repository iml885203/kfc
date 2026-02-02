/**
 * Hook for managing log buffer
 */

import { useCallback, useRef, useState } from 'react'

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
  bufferVersion: number
}

export function useLogBuffer(maxSize: number = 10000): UseLogBufferReturn {
  const buffer = useRef<BufferedLine[]>([])
  const [bufferVersion, setBufferVersion] = useState(0)

  const addLine = useCallback(
    (line: BufferedLine) => {
      buffer.current.push(line)

      // Trim buffer if too large
      if (buffer.current.length > maxSize) {
        buffer.current = buffer.current.slice(-maxSize)
      }

      // Trigger re-render by updating version
      setBufferVersion(v => v + 1)
    },
    [maxSize],
  )

  const clear = useCallback(() => {
    buffer.current = []
    // Trigger re-render by updating version
    setBufferVersion(v => v + 1)
  }, [])

  const getSize = useCallback(() => {
    return buffer.current.length
  }, [])

  return {
    buffer,
    addLine,
    clear,
    getSize,
    bufferVersion,
  }
}
