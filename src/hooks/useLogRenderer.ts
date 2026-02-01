import type { ErrorDetector } from '../utils/errorDetector.js'
import type { BufferedLine } from './useLogBuffer.js'
import type { LogFilterState } from './useLogFilter.js'
import chalk from 'chalk'
import { useCallback, useEffect, useRef } from 'react'
import { colorizeLogLine } from '../utils/colorize.js'
import { filterLines } from '../utils/logFilter.js'
import { highlightMatches } from '../utils/logHighlight.js'

interface UseLogRendererProps {
  write: (text: string) => void
  bufferRef: React.MutableRefObject<BufferedLine[]>
  filter: LogFilterState
  errorDetector?: ErrorDetector
  isConnected: boolean
  errorMode: boolean
  displayState: {
    isWrap: boolean
    isShowingHelp: boolean
  }
}

export function useLogRenderer({
  write,
  bufferRef,
  filter,
  errorDetector,
  isConnected,
  errorMode,
  displayState,
}: UseLogRendererProps) {
  const currentFilter = useRef(filter)
  const errorDetectorRef = useRef(errorDetector)

  useEffect(() => {
    currentFilter.current = filter
    errorDetectorRef.current = errorDetector
  }, [filter, errorDetector])

  const refilterAndDisplay = useCallback(() => {
    write('\x1Bc') // Clear screen

    const { pattern, ignoreCase, invert, context: filterCtx, before, after } = currentFilter.current
    const filtered = filterLines(
      bufferRef.current,
      pattern,
      ignoreCase,
      invert,
      filterCtx,
      before,
      after,
    )

    if (filtered.length === 0 && pattern) {
      write(chalk.yellow(`No matches found for pattern: ${pattern}\n\n`))
    }
    else {
      let lastIdx = -2
      filtered.forEach(({ bufferedLine, isMatch, index }) => {
        if (index - lastIdx > 1 && pattern) {
          write(chalk.gray('--\n'))
        }

        const highlightedLine = pattern && isMatch
          ? highlightMatches(bufferedLine.line, pattern, ignoreCase)
          : bufferedLine.line

        const coloredLine = colorizeLogLine(highlightedLine)

        const prefix = isMatch && pattern ? chalk.red('> ') : '  '
        const podPart = bufferedLine.podPrefix ? `${bufferedLine.podPrefix} ` : ''
        const errorMark = errorDetectorRef.current?.(bufferedLine.line) ? chalk.red('▎') : ' '
        write(`${errorMark}${prefix}${podPart}${coloredLine}\n`)
        lastIdx = index
      })
    }
  }, [bufferRef, write])

  // Initial Clear/Init
  const hasInitialized = useRef(false)
  useEffect(() => {
    if (!hasInitialized.current) {
      write('\n\n\n')
      hasInitialized.current = true
    }
    return () => {
      write('\x1B[?7h') // Enable wrap on exit
    }
  }, [write])

  // Effect: Refilter when relevant state changes
  useEffect(() => {
    write(displayState.isWrap ? '\x1B[?7h' : '\x1B[?7l')

    if (displayState.isShowingHelp) {
      // Logic for help clearing handled by parent render usually,
      // but if we want to clear screen for help mode here if imperative:
      // write('\x1Bc')
      // But React component handles help rendering.
      // We just need to ensure logs are NOT rendered.
    }
    else if (isConnected && !errorMode) {
      refilterAndDisplay()
    }
  }, [
    displayState.isWrap,
    displayState.isShowingHelp,
    isConnected,
    errorMode,
    refilterAndDisplay,
    write,
  ])

  // Effect: Filter change triggers refilter
  useEffect(() => {
    if (isConnected && !errorMode && !displayState.isShowingHelp) {
      refilterAndDisplay()
    }
  }, [filter, isConnected, errorMode, displayState.isShowingHelp, refilterAndDisplay])

  return { refilterAndDisplay }
}
