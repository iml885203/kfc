import type { ErrorDetector } from './errorDetector.js'
import type { ErrorDetectorConfig } from './errorDetectorConfig.js'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { defaultErrorDetector } from './errorDetector.js'
import { createDetectorFromConfig } from './errorDetectorConfig.js'

const ERROR_DETECTOR_FILES = [
  'errorDetector.json',
  'errorDetector.js',
  'errorDetector.ts',
]

function getUserConfigDir() {
  return path.join(os.homedir(), '.kfctl')
}

export async function loadErrorDetector(): Promise<ErrorDetector> {
  const userConfigDir = getUserConfigDir()
  for (const filename of ERROR_DETECTOR_FILES) {
    const filePath = path.join(userConfigDir, filename)

    if (fs.existsSync(filePath)) {
      try {
        if (filename.endsWith('.json')) {
          const content = fs.readFileSync(filePath, 'utf-8')
          const config = JSON.parse(content) as ErrorDetectorConfig
          return createDetectorFromConfig(config)
        }

        const fileUrl = path.isAbsolute(filePath)
          ? `file://${filePath.replace(/\\/g, '/')}`
          : `file://${filePath}`

        const module = await import(fileUrl)
        const detector = (module.errorDetector || module.default) as ErrorDetector
        const isStackTrace = module.isStackTrace

        if (typeof detector === 'function') {
          if (typeof isStackTrace === 'function') {
            detector.isStackTrace = isStackTrace
          }
          return detector
        }

        console.error(`Warning: ${filePath} does not export a valid errorDetector function`)
      }
      catch (error) {
        if (filename.endsWith('.ts')) {
          console.error(`Failed to load TypeScript file ${filePath}.`)
          console.error(`TypeScript files need to be compiled to JavaScript or use tsx.`)
          console.error(`Consider renaming to errorDetector.js or compiling with: npx tsc ${filePath}`)
        }
        else if (filename.endsWith('.json')) {
          console.error(`Failed to load JSON config from ${filePath}:`, error)
          console.error(`Please check the JSON syntax and schema.`)
        }
        else {
          console.error(`Failed to load error detector from ${filePath}:`, error)
        }
      }
    }
  }

  return defaultErrorDetector
}

export function getErrorDetectorPath(): string {
  return path.join(getUserConfigDir(), 'errorDetector.json')
}

export function hasCustomErrorDetector(): boolean {
  const userConfigDir = getUserConfigDir()
  return ERROR_DETECTOR_FILES.some((filename) => {
    const filePath = path.join(userConfigDir, filename)
    return fs.existsSync(filePath)
  })
}
