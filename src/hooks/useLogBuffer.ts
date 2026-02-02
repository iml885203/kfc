/**
 * Hook for managing log buffer
 */

import { useCallback, useRef, useState } from 'react'

export interface BufferedLine {
  podPrefix: string
  line: string
  coloredLine: string
  timestamp: number
  id: number
}

export interface UseLogBufferReturn {
  buffer: React.MutableRefObject<BufferedLine[]>
  addLine: (line: Omit<BufferedLine, 'id'>) => void
  clear: () => void
  getSize: () => number
  bufferVersion: number
}

export function useLogBuffer(maxSize: number = 10000): UseLogBufferReturn {
  const buffer = useRef<BufferedLine[]>([])
  const [bufferVersion, setBufferVersion] = useState(0)
  const nextId = useRef(0)

  const addLine = useCallback(
    (line: Omit<BufferedLine, 'id'>) => {
      const lineWithId: BufferedLine = {
        ...line,
        id: nextId.current++,
      }
      buffer.current.push(lineWithId)

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
