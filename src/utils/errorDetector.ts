import type { ErrorSeverity } from '../types/error.js'

export type ErrorDetector = (line: string) => boolean

export function defaultErrorDetector(line: string): boolean {
  if (!line || typeof line !== 'string') {
    return false
  }

  const upperLine = line.toUpperCase()

  const isHttpLogging = /(?:StatusCode|ResponseBody|Protocol|Method|Scheme|Path|QueryString|Duration)\s*:/i.test(line)
  if (isHttpLogging) {
    const errorCodeMatch = line.match(/"errorCode"\s*:\s*(\d+)/i)
    if (errorCodeMatch) {
      const code = Number.parseInt(errorCodeMatch[1], 10)
      return code >= 500 && code < 600
    }
    return false
  }

  if (/\[\d{2}:\d{2}:\d{2}\.\d+\s+(?:ERR|FATAL|CRITICAL)\]/.test(line)) {
    return true
  }
  if (/\[(?:ERROR|FATAL|CRITICAL|ERR)\]/i.test(line)) {
    return true
  }

  const hasErrorKeyword = /\b(?:ERROR|FATAL|CRITICAL|EXCEPTION|UNHANDLED\s+EXCEPTION)\b/.test(upperLine)
  if (hasErrorKeyword) {
    if (/"(?:errorCode|errorMessage|errorDetails|errorStack)"\s*:/i.test(line)) {
      return false
    }
    return true
  }

  if (/\bFAILED\b/.test(upperLine) && !/\b(?:SUCCESS|SUCCEEDED|OK|COMPLETED)\b/.test(upperLine)) {
    return true
  }

  if (isStackTraceLine(line)) {
    return true
  }

  return false
}

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

export function extractErrorType(line: string): string {
  const exceptionMatch = line.match(/(\w+Exception)/)
  if (exceptionMatch) {
    return exceptionMatch[1]
  }

  const lowerLine = line.toLowerCase()

  if (lowerLine.includes('timeout')) {
    return 'Timeout'
  }

  if (lowerLine.includes('null reference')) {
    return 'NullReference'
  }

  if (lowerLine.includes('database')) {
    return 'DatabaseError'
  }

  if (lowerLine.includes('connection')) {
    return 'ConnectionError'
  }

  if (line.toLowerCase().includes('unauthorized') || line.toLowerCase().includes('forbidden')) {
    return 'AuthorizationError'
  }

  return 'Error'
}

export function isStackTraceLine(line: string): boolean {
  const trimmed = line.trim()

  return (
    /^\s*at\s+[\w.]+\(/.test(trimmed)
    || /^File "[^"]+", line \d+/.test(trimmed)
    || /^\s*at\s[^(]+\([^:]+:\d+:\d+\)/.test(trimmed)
    || (/^\s{4,}/.test(line) && /\([^)]+\)/.test(line))
  )
}

export function extractTimestamp(line: string): string {
  const patterns = [
    /\[(\d{2}:\d{2}:\d{2}\.\d+)\]/,
    /(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})/,
    /(\d{2}:\d{2}:\d{2}\.\d+)/,
    /(\d{2}:\d{2}:\d{2})/,
  ]

  for (const pattern of patterns) {
    const match = line.match(pattern)
    if (match) {
      return match[1]
    }
  }

  const now = new Date()
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}.${String(now.getMilliseconds()).padStart(3, '0')}`
}

export function aspNetCoreErrorDetector(line: string): boolean {
  if (!line || typeof line !== 'string') {
    return false
  }

  const aspNetLogLevelMatch = line.match(/\[\d{2}:\d{2}:\d{2}\.\d+\s+(?:ERR|FATAL|CRITICAL)\]/)
  if (aspNetLogLevelMatch) {
    return true
  }

  const isHttpLogging = /(?:StatusCode|ResponseBody|Protocol|Method|Scheme|Path|QueryString|Duration|Request and Response)\s*:/i.test(line)
  if (isHttpLogging) {
    const errorCodeMatch = line.match(/"errorCode"\s*:\s*(\d+)/i)
    if (errorCodeMatch) {
      const code = Number.parseInt(errorCodeMatch[1], 10)
      return code >= 500 && code < 600
    }
    return false
  }

  if (/\[(?:ERROR|FATAL|CRITICAL|ERR)\]/i.test(line)) {
    return true
  }

  const hasException = /(?:^|\W)(?:EXCEPTION|UNHANDLED\s+EXCEPTION)(?:\W|$)/i.test(line) || /\w+Exception/i.test(line)
  if (hasException) {
    if (/"(?:errorCode|errorMessage|errorDetails|errorStack)"\s*:/i.test(line)) {
      return false
    }
    return true
  }

  if (isStackTraceLine(line)) {
    return true
  }

  return false
}

export const isErrorLog = defaultErrorDetector
