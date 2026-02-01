import clipboard from 'clipboardy'

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await clipboard.write(text)
    return true
  }
  catch {
    return false
  }
}

export function stripAnsiCodes(text: string): string {
  // eslint-disable-next-line no-control-regex
  return text.replace(/\x1B\[[0-9;]*m/g, '')
}

export function formatErrorLine(
  pod: string,
  container: string,
  timestamp: string,
  line: string,
): string {
  const cleanLine = stripAnsiCodes(line)
  return `[${pod}/${container}] [${timestamp}] ${cleanLine}`
}

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
