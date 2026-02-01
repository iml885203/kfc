/**
 * Error Detector Examples
 *
 * This file shows examples of how to create custom error detectors
 * for different logging formats and use cases.
 */

import type { ErrorDetector } from './errorDetector.js'
import { aspNetCoreErrorDetector, defaultErrorDetector, isStackTraceLine } from './errorDetector.js'

/**
 * Example 1: ASP.NET Core Error Detector
 *
 * Use this for ASP.NET Core applications that log in format:
 * [HH:mm:ss.fff INF] Normal log message
 * [HH:mm:ss.fff ERR] Error log message
 *
 * Usage:
 * ```typescript
 * import { aspNetCoreErrorDetector } from './utils/errorDetector.js'
 *
 * <LogViewer
 *   deployment="my-api"
 *   namespace="default"
 *   errorDetector={aspNetCoreErrorDetector}
 *   ...
 * />
 * ```
 */
export const aspNetCoreExample: ErrorDetector = aspNetCoreErrorDetector

/**
 * Example 2: Simple Keyword-Based Detector
 *
 * Only detects lines containing explicit error keywords
 */
export const simpleKeywordDetector: ErrorDetector = (line: string): boolean => {
  const upperLine = line.toUpperCase()
  return (
    upperLine.includes('[ERROR]')
    || upperLine.includes('[FATAL]')
    || upperLine.includes('[ERR]')
    || upperLine.includes('EXCEPTION')
    || isStackTraceLine(line)
  )
}

/**
 * Example 3: JSON Log Format Detector
 *
 * For applications that log in JSON format:
 * {"level":"error","message":"Something went wrong"}
 * {"level":"info","message":"Normal operation"}
 */
export const jsonLogDetector: ErrorDetector = (line: string): boolean => {
  try {
    const json = JSON.parse(line.trim())
    const level = String(json.level || json.severity || json.lvl || '').toLowerCase()
    return level === 'error' || level === 'fatal' || level === 'critical' || level === 'err'
  }
  catch {
    // Not JSON, fall back to default detection
    return defaultErrorDetector(line)
  }
}

/**
 * Example 4: Custom ASP.NET Core Detector with Additional Rules
 *
 * Extends the ASP.NET Core detector with custom business logic
 */
export const customAspNetDetector: ErrorDetector = (line: string): boolean => {
  // First check ASP.NET Core format
  if (aspNetCoreErrorDetector(line)) {
    return true
  }

  // Add custom rules for your application
  // Example: Treat specific HTTP status codes as errors
  const statusCodeMatch = line.match(/StatusCode:\s*(\d{3})/)
  if (statusCodeMatch) {
    const code = Number.parseInt(statusCodeMatch[1], 10)
    // Treat 429 (Too Many Requests) and 503 (Service Unavailable) as errors
    if (code === 429 || code === 503) {
      return true
    }
  }

  // Example: Detect specific error patterns in your application
  if (line.includes('Database connection timeout')
    || line.includes('External API failed')) {
    return true
  }

  return false
}

/**
 * Example 5: Log Level Only Detector
 *
 * Only detects errors based on log level markers, ignores keywords
 * Useful when "ERROR" might appear in normal log messages
 */
export const logLevelOnlyDetector: ErrorDetector = (line: string): boolean => {
  // ASP.NET Core format: [HH:mm:ss.fff ERR]
  if (/\[\d{2}:\d{2}:\d{2}\.\d+\s+(?:ERR|FATAL|CRITICAL)\]/.test(line)) {
    return true
  }

  if (/\[(?:ERROR|FATAL|CRITICAL|ERR)\]/i.test(line)) {
    return true
  }

  // Stack traces always indicate errors
  if (isStackTraceLine(line)) {
    return true
  }

  return false
}

/**
 * Example 6: Combining Multiple Detectors
 *
 * Use multiple detectors and return true if any of them detect an error
 */
export function combineDetectors(...detectors: ErrorDetector[]): ErrorDetector {
  return (line: string): boolean => {
    return detectors.some(detector => detector(line))
  }
}

// Usage example:
// const combinedDetector = combineDetectors(
//   aspNetCoreErrorDetector,
//   customAspNetDetector
// )
