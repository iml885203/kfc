import type { useInput } from 'ink'
import type { LogDisplayState } from './useLogDisplayState.js'
import type { LogLine } from './useLogStream.js'
import chalk from 'chalk'
import { useState } from 'react'

interface LogFilter {
  pattern: string
  setPattern: (pattern: string) => void
  clearFilter: () => void
  toggleIgnoreCase: () => void
  toggleInvert: () => void
  increaseContext: () => void
  decreaseContext: () => void
}

interface LogBuffer {
  clear: () => void
  addLine: (line: LogLine) => void
}

interface ErrorEntry {
  pod: string
  container: string
  timeString: string
  rawLine: string
  contextBefore: { raw: string }[]
  contextAfter: { raw: string }[]
}

interface ErrorCollection {
  errors: ErrorEntry[]
  getError: (index: number) => ErrorEntry | undefined
}

export interface UseLogInputHandlerProps {
  useInputHook: typeof useInput
  exit: () => void
  write: (text: string) => void
  onBack?: () => void
  displayState: LogDisplayState
  filter: LogFilter
  buffer: LogBuffer
  errorCollection: ErrorCollection
  isConnected: boolean
  errorMode: boolean
  setErrorMode: (mode: boolean) => void
  stdoutRows?: number
}

export function useLogInputHandler({
  useInputHook,
  write,
  onBack,
  displayState,
  filter,
  buffer,
  isConnected,
  errorMode,
  setErrorMode,
  // Removed unused props
}: UseLogInputHandlerProps) {
  const [filterInput, setFilterInput] = useState('')

  useInputHook((input, key) => {
    // 1. Help Mode
    if (displayState.isShowingHelp) {
      displayState.setIsShowingHelp(false)
      return
    }

    if (!isConnected) {
      return
    }

    // 2. Filter Mode
    if (displayState.filterMode) {
      if (key.return) {
        filter.setPattern(filterInput)
        displayState.setFilterMode(false)
      }
      else if (key.escape) {
        displayState.setFilterMode(false)
        setFilterInput('')
      }
      else if (key.backspace || key.delete) {
        if (key.meta) {
          setFilterInput((prev) => {
            const words = prev.trimEnd().split(' ')
            words.pop()
            return words.join(' ') + (words.length > 0 ? ' ' : '')
          })
          return
        }
        if (key.ctrl) {
          setFilterInput('')
          return
        }
        setFilterInput(prev => prev.slice(0, -1))
      }
      else if (key.ctrl && input === 'u') {
        setFilterInput('')
      }
      else if (!key.ctrl && !key.meta && input) {
        setFilterInput(prev => prev + input)
      }
      return
    }

    // 3. Normal Mode
    if (input === 'e') {
      setErrorMode(true)
    }
    else if (input === '/') {
      displayState.setFilterMode(true)
      setFilterInput(filter.pattern)
    }
    else if (input === 'c') {
      filter.clearFilter()
    }
    else if (input === 'i') {
      filter.toggleIgnoreCase()
    }
    else if (input === 'v') {
      filter.toggleInvert()
    }
    else if (input === 'p') {
      displayState.setPaused(!displayState.paused)
    }
    else if (input === '+') {
      filter.increaseContext()
    }
    else if (input === '-') {
      filter.decreaseContext()
    }
    else if (input === '?') {
      displayState.setIsShowingHelp(true)
    }
    else if (key.escape && onBack) {
      onBack()
    }
    else if (input === 'x' || (key.ctrl && input === 'l')) {
      buffer.clear()
    }
    else if (input === 'm') {
      const separator = chalk.dim('----------------------------------------------------------------')
      const markLine = {
        podPrefix: '',
        line: '',
        coloredLine: separator,
        timestamp: Date.now(),
      }
      buffer.addLine(markLine)
      if (!displayState.paused) {
        write(`  ${separator}\n`)
      }
    }
    else if (input === 'w') {
      displayState.setIsWrap(!displayState.isWrap)
    }
  }, { isActive: !errorMode })

  return { filterInput }
}
