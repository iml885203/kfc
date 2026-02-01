import type { ErrorDetector } from './errorDetector.js'
import type { ErrorDetectorConfig } from './errorDetectorConfig.js'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { defaultErrorDetector } from './errorDetector.js'
import { createDetectorFromConfig } from './errorDetectorConfig.js'

const USER_CONFIG_DIR = path.join(os.homedir(), '.kfctl')
const ERROR_DETECTOR_FILES = [
  'errorDetector.json',
  'errorDetector.js',
  'errorDetector.ts',
]

export async function loadErrorDetector(): Promise<ErrorDetector> {
  for (const filename of ERROR_DETECTOR_FILES) {
    const filePath = path.join(USER_CONFIG_DIR, filename)

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
        const detector = module.errorDetector || module.default

        if (typeof detector === 'function') {
          return detector as ErrorDetector
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
  return path.join(USER_CONFIG_DIR, 'errorDetector.json')
}

export function hasCustomErrorDetector(): boolean {
  return ERROR_DETECTOR_FILES.some((filename) => {
    const filePath = path.join(USER_CONFIG_DIR, filename)
    return fs.existsSync(filePath)
  })
}
