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
  bufferVersion: number
}

function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T | undefined>(undefined)
  useEffect(() => {
    ref.current = value
  })
  return ref.current
}

export function useLogRenderer({
  write,
  bufferRef,
  filter,
  errorDetector,
  isConnected,
  errorMode,
  displayState,
  bufferVersion,
}: UseLogRendererProps) {
  const currentFilter = useRef(filter)
  const errorDetectorRef = useRef(errorDetector)
  const lastRenderedId = useRef<number>(-1)
  const lastMatchId = useRef<number>(-1)

  // Track previous states to detect changes
  const prevFilter = usePrevious(filter)
  const prevIsConnected = usePrevious(isConnected)
  const prevErrorMode = usePrevious(errorMode)
  const prevIsShowingHelp = usePrevious(displayState.isShowingHelp)

  // Update refs
  useEffect(() => {
    currentFilter.current = filter
    errorDetectorRef.current = errorDetector
  }, [filter, errorDetector])

  const fullRender = useCallback(() => {
    write('\x1Bc') // Clear screen
    lastRenderedId.current = -1
    lastMatchId.current = -1

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
        lastRenderedId.current = bufferedLine.id
        if (isMatch)
          lastMatchId.current = bufferedLine.id
      })

      // If we filtered and found nothing or something, ensuring we track the latest buffer ID
      // is complex because we only rendered matches.
      // But for incremental logic to work, we must assume we "processed" everything in the buffer.
      // So we set lastRenderedId to the content's max ID.
      const buffer = bufferRef.current
      if (buffer.length > 0) {
        lastRenderedId.current = buffer[buffer.length - 1].id
      }
    }
  }, [bufferRef, write])

  const incrementalRender = useCallback(() => {
    const { pattern, ignoreCase, invert, context: filterCtx, before, after } = currentFilter.current

    // If context is used, fallback to full render (simplification for correctness)
    if (filterCtx > 0 || before > 0 || after > 0) {
      fullRender()
      return
    }

    // Process new lines
    const buffer = bufferRef.current
    const newLines = buffer.filter(l => l.id > lastRenderedId.current)

    if (newLines.length === 0)
      return

    let regex: RegExp | null = null
    try {
      if (pattern)
        regex = new RegExp(pattern, ignoreCase ? 'i' : '')
    }
    catch {}

    newLines.forEach((line) => {
      let isMatch = true
      if (regex) {
        const matches = regex.test(line.line)
        isMatch = invert ? !matches : matches
      }
      else if (pattern) { // Invalid regex case
        // Fallback: match everything or nothing? usually match everything to be safe
        isMatch = true
      }

      if (isMatch) {
        // Check separator
        if (pattern && lastMatchId.current !== -1 && line.id - lastMatchId.current > 1) {
          write(chalk.gray('--\n'))
        }

        const highlightedLine = (pattern && regex && !invert) // Highlighting only makes sense if not inverted
          ? highlightMatches(line.line, pattern, ignoreCase)
          : line.line

        const coloredLine = colorizeLogLine(highlightedLine)
        const prefix = isMatch && pattern ? chalk.red('> ') : '  '
        const podPart = line.podPrefix ? `${line.podPrefix} ` : ''
        const errorMark = errorDetectorRef.current?.(line.line) ? chalk.red('▎') : ' '

        write(`${errorMark}${prefix}${podPart}${coloredLine}\n`)
        lastMatchId.current = line.id
      }

      lastRenderedId.current = line.id
    })
  }, [bufferRef, write, fullRender])

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

    if (displayState.isShowingHelp || errorMode) {
      // Logic for help clearing handled by parent render usually,
      // but React component handles help rendering.
      return
    }

    if (!isConnected) {
      return
    }

    // Determine if we need full render
    // We deep compare filter by stringifying because it's a small object
    const filterChanged = JSON.stringify(prevFilter) !== JSON.stringify(filter)
    const justConnected = !prevIsConnected && isConnected
    const modeChanged = prevErrorMode !== errorMode || prevIsShowingHelp !== displayState.isShowingHelp

    // If context is used, we always full render on updates (handled inside incrementalRender usually,
    // but here we check trigger conditions)
    // Actually, if we use Context, incrementalRender redirects to fullRender, so we are safe calling incrementalRender
    // UNLESS the filter *changed*.

    if (filterChanged || justConnected || modeChanged || lastRenderedId.current === -1 || bufferRef.current.length === 0) {
      fullRender()
    }
    else {
      incrementalRender()
    }
  }, [
    displayState.isWrap,
    displayState.isShowingHelp,
    isConnected,
    errorMode,
    fullRender,
    incrementalRender,
    write,
    bufferVersion,
    filter,
    prevFilter,
    prevIsConnected,
    prevErrorMode,
    prevIsShowingHelp,
  ])

  return { refilterAndDisplay: fullRender }
}
