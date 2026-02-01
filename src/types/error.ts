export interface LogLine {
  raw: string
  colored: string
  timestamp: number
  timeString?: string
}

export type ErrorSeverity = 'ERROR' | 'FATAL' | 'CRITICAL' | 'EXCEPTION'

export interface ErrorEntry {
  id: string
  index: number
  timestamp: number
  timeString: string
  pod: string
  container: string
  severity: ErrorSeverity
  errorType: string
  rawLine: string
  coloredLine: string
  contextBefore: LogLine[]
  contextAfter: LogLine[]
  stackTrace: string[]
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
