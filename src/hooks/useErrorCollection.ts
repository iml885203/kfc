/**
 * Hook for collecting errors from log stream
 * This runs continuously in the background regardless of view mode
 */

import type { ErrorEntry, LogLine } from '../types/error.js'
import type { ErrorDetector } from '../utils/errorDetector.js'
import { useCallback, useMemo, useRef, useState } from 'react'
import { stripAnsiCodes } from '../utils/clipboard.js'
import { defaultErrorDetector, extractErrorSeverity, extractErrorType, extractTimestamp, isStackTraceLine } from '../utils/errorDetector.js'

const MAX_ERRORS = 100 // Keep last 100 errors
const CONTEXT_LINES = 3 // Lines before/after error

export interface UseErrorCollectionReturn {
  errors: ErrorEntry[]
  errorCount: number
  addLogLine: (line: string, coloredLine: string, pod: string, container: string) => void
  getError: (index: number) => ErrorEntry | undefined
  clearErrors: () => void
}

export interface UseErrorCollectionOptions {
  /**
   * Custom error detector function
   * If not provided, uses defaultErrorDetector
   *
   * @example
   * // Use ASP.NET Core detector
   * useErrorCollection(deployment, namespace, context, {
   *   errorDetector: aspNetCoreErrorDetector
   * })
   *
   * @example
   * // Custom detector
   * useErrorCollection(deployment, namespace, context, {
   *   errorDetector: (line) => line.includes('[ERROR]')
   * })
   */
  errorDetector?: ErrorDetector
}

export function useErrorCollection(
  deployment: string,
  namespace: string,
  context?: string,
  options?: UseErrorCollectionOptions,
): UseErrorCollectionReturn {
  // Use useMemo to ensure errorDetector updates when options changes
  const errorDetector = useMemo(
    () => options?.errorDetector ?? defaultErrorDetector,
    [options?.errorDetector],
  )
  const [errors, setErrors] = useState<ErrorEntry[]>([])
  const errorsRef = useRef<ErrorEntry[]>([])

  // Buffer to store recent lines for context
  const lineBuffer = useRef<Array<{
    raw: string
    colored: string
    timestamp: number
  }>>([])

  // Track if we're collecting stack trace
  const collectingStackTrace = useRef(false)
  const currentStackTrace = useRef<string[]>([])

  const addLogLine = useCallback(
    (line: string, coloredLine: string, pod: string, container: string) => {
      // Guard against undefined/null/empty lines
      if (!line || typeof line !== 'string') {
        return
      }

      const timestamp = Date.now()
      const timeString = extractTimestamp(line)

      // Add to buffer for context
      lineBuffer.current.push({
        raw: line,
        colored: coloredLine,
        timestamp,
      })

      // Keep buffer size reasonable (context lines * 2 + 10)
      const maxBufferSize = (CONTEXT_LINES * 2) + 10
      if (lineBuffer.current.length > maxBufferSize) {
        lineBuffer.current = lineBuffer.current.slice(-maxBufferSize)
      }

      // Check if we're collecting stack trace
      if (collectingStackTrace.current && isStackTraceLine(line)) {
        currentStackTrace.current.push(stripAnsiCodes(line))
        return
      }

      // If we were collecting stack trace and this isn't a stack trace line,
      // attach stack trace to the last error
      if (collectingStackTrace.current && !isStackTraceLine(line)) {
        collectingStackTrace.current = false
        if (errorsRef.current.length > 0) {
          const lastError = errorsRef.current[errorsRef.current.length - 1]
          lastError.stackTrace = [...currentStackTrace.current]
          setErrors([...errorsRef.current])
        }
        currentStackTrace.current = []
      }

      // Check if this is an error line using the custom detector
      const isError = errorDetector(line)
      if (isError) {
        const severity = extractErrorSeverity(line)
        const errorType = extractErrorType(line)

        // Get context from buffer
        // The error line is at index bufferSize - 1 (last item, just pushed)
        // We want the CONTEXT_LINES items immediately before the error line
        const bufferSize = lineBuffer.current.length
        const errorIndex = bufferSize - 1
        // Calculate start index: we want the last CONTEXT_LINES items before the error
        // For bufferSize=5, CONTEXT_LINES=3, errorIndex=4: we want indices [1, 2, 3]
        // Formula: start = max(0, errorIndex - CONTEXT_LINES) = max(0, 4 - 3) = 1
        const contextBeforeStart = Math.max(0, errorIndex - CONTEXT_LINES)
        // End index is errorIndex (exclusive, so we get items up to but not including the error line)
        const contextBefore: LogLine[] = lineBuffer.current
          .slice(contextBeforeStart, errorIndex)
          .map(item => ({
            raw: stripAnsiCodes(item.raw),
            colored: item.colored,
            timestamp: item.timestamp,
            timeString: extractTimestamp(item.raw),
          }))

        // Create error entry
        const errorEntry: ErrorEntry = {
          id: `${timestamp}-${errorsRef.current.length}`,
          index: errorsRef.current.length + 1,
          timestamp,
          timeString,
          pod,
          container,
          severity,
          errorType,
          rawLine: stripAnsiCodes(line),
          coloredLine,
          contextBefore,
          contextAfter: [], // Will be filled as more lines come
          stackTrace: [],
          metadata: {
            deployment,
            namespace,
            context,
          },
        }

        // Add to errors list
        errorsRef.current.push(errorEntry)

        // Keep only last MAX_ERRORS
        if (errorsRef.current.length > MAX_ERRORS) {
          errorsRef.current = errorsRef.current.slice(-MAX_ERRORS)
          // Re-index
          errorsRef.current.forEach((err, idx) => {
            err.index = idx + 1
          })
        }

        // Update state
        setErrors([...errorsRef.current])

        // Start collecting stack trace
        collectingStackTrace.current = true
        currentStackTrace.current = []
      }
      else {
        // Not an error line - might be context after previous error
        if (errorsRef.current.length > 0) {
          const lastError = errorsRef.current[errorsRef.current.length - 1]

          // Only add to contextAfter if we haven't filled it yet
          if (lastError.contextAfter.length < CONTEXT_LINES) {
            lastError.contextAfter.push({
              raw: stripAnsiCodes(line),
              colored: coloredLine,
              timestamp,
              timeString,
            })

            // Update state if we just completed the context
            if (lastError.contextAfter.length === CONTEXT_LINES) {
              setErrors([...errorsRef.current])
            }
          }
        }
      }
    },
    [deployment, namespace, context, errorDetector],
  )

  const getError = useCallback((index: number): ErrorEntry | undefined => {
    return errorsRef.current.find(err => err.index === index)
  }, [])

  const clearErrors = useCallback(() => {
    errorsRef.current = []
    setErrors([])
    lineBuffer.current = []
    collectingStackTrace.current = false
    currentStackTrace.current = []
  }, [])

  return {
    errors,
    errorCount: errors.length,
    addLogLine,
    getError,
    clearErrors,
  }
}
