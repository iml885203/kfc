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
