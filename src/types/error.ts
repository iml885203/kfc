/**
 * Error collection types for quick error copy feature
 */

export interface LogLine {
  raw: string // Raw text without colors
  colored: string // Colored text with ANSI codes
  timestamp: number // Unix timestamp
  timeString?: string // Formatted time string like "14:23:01.789"
}

export type ErrorSeverity = 'ERROR' | 'FATAL' | 'CRITICAL' | 'EXCEPTION'

export interface ErrorEntry {
  id: string // Unique ID (timestamp + index)
  index: number // Display number (1-based)
  timestamp: number // Unix timestamp
  timeString: string // "14:23:01.789"
  pod: string // "pod-1"
  container: string // "api"
  severity: ErrorSeverity // Error severity level
  errorType: string // "NullReferenceException", "DatabaseTimeout", etc.
  rawLine: string // Original error line (no colors)
  coloredLine: string // Colored error line
  contextBefore: LogLine[] // N lines before error
  contextAfter: LogLine[] // N lines after error
  stackTrace: string[] // Stack trace lines if available
  metadata: {
    deployment: string
    namespace: string
    context?: string
  }
}

export interface ErrorCollectionState {
  errors: ErrorEntry[]
  totalCount: number
  lastErrorTime: number | null
}
