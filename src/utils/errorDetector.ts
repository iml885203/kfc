/**
 * Error detection utilities
 */

import type { ErrorSeverity } from '../types/error.js'

/**
 * Check if a log line contains an error
 * @param line Log line to check
 * @returns true if line contains error keywords
 */
export function isErrorLog(line: string): boolean {
  const upperLine = line.toUpperCase()
  return (
    upperLine.includes('ERROR')
    || upperLine.includes('FATAL')
    || upperLine.includes('CRITICAL')
    || upperLine.includes('EXCEPTION')
    // Common error patterns
    || upperLine.includes('UNHANDLED')
    || upperLine.includes('FAILED')
    // ASP.NET Core format
    || /\[ERR\]|\[FATAL\]/.test(line)
  // Note: Stack trace lines are detected separately via isStackTraceLine()
  // and should not be flagged as errors themselves to avoid false positives
  // (e.g., timestamps like "at 10:30:45 (UTC)" or function calls)
  )
}

/**
 * Extract error severity from log line
 * @param line Log line
 * @returns Error severity
 */
export function extractErrorSeverity(line: string): ErrorSeverity {
  const upperLine = line.toUpperCase()

  if (upperLine.includes('FATAL') || upperLine.includes('[FATAL]')) {
    return 'FATAL'
  }

  if (upperLine.includes('CRITICAL')) {
    return 'CRITICAL'
  }

  if (upperLine.includes('EXCEPTION')) {
    return 'EXCEPTION'
  }

  return 'ERROR'
}

/**
 * Extract error type from log line
 * @param line Log line
 * @returns Error type string
 */
export function extractErrorType(line: string): string {
  // Try to find exception types (e.g., NullReferenceException, TimeoutException)
  const exceptionMatch = line.match(/(\w+Exception)/)
  if (exceptionMatch) {
    return exceptionMatch[1]
  }

  // Try to find common error patterns
  if (line.toLowerCase().includes('timeout')) {
    return 'Timeout'
  }

  if (line.toLowerCase().includes('connection')) {
    return 'ConnectionError'
  }

  if (line.toLowerCase().includes('null reference')) {
    return 'NullReference'
  }

  if (line.toLowerCase().includes('database')) {
    return 'DatabaseError'
  }

  if (line.toLowerCase().includes('unauthorized') || line.toLowerCase().includes('forbidden')) {
    return 'AuthorizationError'
  }

  // Default to generic error
  return 'Error'
}

/**
 * Check if a line is part of a stack trace
 * @param line Log line
 * @returns true if line looks like stack trace
 */
export function isStackTraceLine(line: string): boolean {
  const trimmed = line.trim()

  // Common stack trace patterns
  return (
  // Java/C# style: "at ClassName.MethodName(...)"
    /^\s*at\s+[\w.]+\(/.test(trimmed)
    // Python style: "File "...", line ..."
    || /^File "[^"]+", line \d+/.test(trimmed)
    // JavaScript style: "at Object.<anonymous> (...)"
    || /^\s*at\s[^(]+\([^:]+:\d+:\d+\)/.test(trimmed)
    // Generic indented continuation
    || (/^\s{4,}/.test(line) && /\([^)]+\)/.test(line))
  )
}

/**
 * Extract timestamp from log line
 * @param line Log line
 * @returns Time string or empty string
 */
export function extractTimestamp(line: string): string {
  // Try to match various timestamp formats
  const patterns = [
    // [HH:mm:ss.fff] format
    /\[(\d{2}:\d{2}:\d{2}\.\d+)\]/,
    // HH:mm:ss.fff format
    /(\d{2}:\d{2}:\d{2}\.\d+)/,
    // HH:mm:ss format
    /(\d{2}:\d{2}:\d{2})/,
    // ISO format
    /(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})/,
  ]

  for (const pattern of patterns) {
    const match = line.match(pattern)
    if (match) {
      return match[1]
    }
  }

  // Fallback to current time
  const now = new Date()
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}.${String(now.getMilliseconds()).padStart(3, '0')}`
}
