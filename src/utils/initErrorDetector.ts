import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { DEFAULT_ASPNET_CONFIG } from './errorDetectorConfig.js'
import { getErrorDetectorPath, hasCustomErrorDetector } from './errorDetectorLoader.js'

const USER_CONFIG_DIR = path.join(os.homedir(), '.kfctl')

const ERROR_DETECTOR_JSON_TEMPLATE = JSON.stringify(
  {
    $schema: 'https://kfctl.dev/error-detector-config.schema.json',
    description: 'Custom error detector configuration for KFC',
    comment: 'Edit this file to customize error detection for your application',
    ...DEFAULT_ASPNET_CONFIG,
  },
  null,
  2,
)

const _ERROR_DETECTOR_JS_TEMPLATE = `function aspNetCoreDetector(line) {
  if (/\\[\\d{2}:\\d{2}:\\d{2}\\.\\d+\\s+(ERR|FATAL|CRITICAL)\\]/.test(line)) {
    return true
  }

  if (/(?:StatusCode|ResponseBody|Protocol|Method|Scheme|Path|QueryString|Duration|Request and Response)\\s*:/i.test(line)) {
    const errorCodeMatch = line.match(/"errorCode"\\s*:\\s*(\\d+)/i)
    if (errorCodeMatch) {
      const code = parseInt(errorCodeMatch[1], 10)
      return code >= 500 && code < 600
    }
    return false
  }

  if (/\\[(ERROR|FATAL|CRITICAL|ERR)\\]/i.test(line)) {
    return true
  }

  if (/\\b(EXCEPTION|UNHANDLED\\s+EXCEPTION)\\b/i.test(line)) {
    if (/"(errorCode|errorMessage|errorDetails|errorStack)"\\s*:/i.test(line)) {
      return false
    }
    return true
  }

  const trimmed = line.trim()
  if (/^\\s*at\\s+[\\w.]+(/.test(trimmed)) {
    return true
  }
  if (/^File "[^"]+", line \\d+/.test(trimmed)) {
    return true
  }
  if (/^\\s*at\\s[^(]+\\([^:]+:\\d+:\\d+\\)/.test(trimmed)) {
    return true
  }
  if (/^\\s{4,}/.test(line) && /\\([^)]+\\)/.test(line)) {
    return true
  }

  return false
}

export const errorDetector = aspNetCoreDetector
`

export function initErrorDetector(): { success: boolean, message: string, path: string } {
  const detectorPath = getErrorDetectorPath()

  if (hasCustomErrorDetector()) {
    return {
      success: false,
      message: `Error detector file already exists.\nEdit ~/.kfctl/errorDetector.json, ~/.kfctl/errorDetector.js, or ~/.kfctl/errorDetector.ts to customize error detection.`,
      path: detectorPath,
    }
  }

  try {
    if (!fs.existsSync(USER_CONFIG_DIR)) {
      fs.mkdirSync(USER_CONFIG_DIR, { recursive: true })
    }

    fs.writeFileSync(detectorPath, ERROR_DETECTOR_JSON_TEMPLATE, 'utf-8')

    return {
      success: true,
      message: `Error detector configuration created at:\n${detectorPath}\n\nEdit this JSON file to customize error detection.\nFor complex logic, rename to errorDetector.js and use JavaScript.`,
      path: detectorPath,
    }
  }
  catch (error) {
    return {
      success: false,
      message: `Failed to create error detector file: ${error instanceof Error ? error.message : String(error)}`,
      path: detectorPath,
    }
  }
}
