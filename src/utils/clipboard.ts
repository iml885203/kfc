/**
 * Clipboard utilities for copying logs
 */

import clipboard from 'clipboardy'

/**
 * Copy text to system clipboard
 * @param text Text to copy
 * @returns true if successful, false otherwise
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await clipboard.write(text)
    return true
  }
  catch {
    // Clipboard might not be available in some environments
    return false
  }
}

/**
 * Remove ANSI color codes from text
 * @param text Text with ANSI codes
 * @returns Clean text without ANSI codes
 */
export function stripAnsiCodes(text: string): string {
  // Remove all ANSI escape sequences
  // eslint-disable-next-line no-control-regex
  return text.replace(/\x1B\[[0-9;]*m/g, '')
}

/**
 * Format error for clipboard (single line)
 * @param pod Pod name
 * @param container Container name
 * @param timestamp Time string
 * @param line Error line
 * @returns Formatted string
 */
export function formatErrorLine(
  pod: string,
  container: string,
  timestamp: string,
  line: string,
): string {
  const cleanLine = stripAnsiCodes(line)
  return `[${pod}/${container}] [${timestamp}] ${cleanLine}`
}

/**
 * Format error with context for clipboard
 * @param pod Pod name
 * @param container Container name
 * @param timestamp Time string
 * @param errorLine Main error line
 * @param contextBefore Lines before error
 * @param contextAfter Lines after error
 * @param deployment Deployment name
 * @param namespace Namespace
 * @returns Formatted multi-line string
 */
export function formatErrorWithContext(
  pod: string,
  container: string,
  timestamp: string,
  errorLine: string,
  contextBefore: string[],
  contextAfter: string[],
  deployment: string,
  namespace: string,
): string {
  const separator = '─'.repeat(65)
  const cleanError = stripAnsiCodes(errorLine)
  const cleanBefore = contextBefore.map(stripAnsiCodes)
  const cleanAfter = contextAfter.map(stripAnsiCodes)

  const parts = [
    separator,
    `ERROR from Deployment: ${deployment}`,
    `Namespace: ${namespace}`,
    `Pod: ${pod}/${container}`,
    `Timestamp: ${timestamp}`,
    separator,
    '',
  ]

  if (cleanBefore.length > 0) {
    parts.push(`Context (${cleanBefore.length} lines before):`)
    cleanBefore.forEach(line => parts.push(`  ${line}`))
    parts.push('')
  }

  parts.push('ERROR:')
  parts.push(`🔴 ${cleanError}`)
  parts.push('')

  if (cleanAfter.length > 0) {
    parts.push(`Context (${cleanAfter.length} lines after):`)
    cleanAfter.forEach(line => parts.push(`  ${line}`))
    parts.push('')
  }

  parts.push(separator)
  parts.push(`Copied via kfctl at ${new Date().toLocaleString()}`)
  parts.push(separator)

  return parts.join('\n')
}
