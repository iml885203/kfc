/**
 * Integration test to reproduce user's issue
 * Tests the complete flow: config loading -> detector creation -> log detection
 */

import type { ErrorDetectorConfig } from './errorDetectorConfig.js'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { loadErrorDetector } from './errorDetectorLoader.js'

const TEST_CONFIG_DIR = path.join(os.tmpdir(), `kfctl-integration-test-${Date.now()}`)
const TEST_KFCTL_DIR = path.join(TEST_CONFIG_DIR, '.kfctl')

describe('error Detector Integration Test - User Issue Reproduction', () => {
  beforeEach(() => {
    if (!fs.existsSync(TEST_KFCTL_DIR)) {
      fs.mkdirSync(TEST_KFCTL_DIR, { recursive: true })
    }
    vi.spyOn(os, 'homedir').mockReturnValue(TEST_CONFIG_DIR)
  })

  afterEach(() => {
    if (fs.existsSync(TEST_KFCTL_DIR)) {
      const files = fs.readdirSync(TEST_KFCTL_DIR)
      files.forEach((file) => {
        fs.unlinkSync(path.join(TEST_KFCTL_DIR, file))
      })
      fs.rmdirSync(TEST_KFCTL_DIR)
    }
    if (fs.existsSync(TEST_CONFIG_DIR)) {
      try {
        fs.rmdirSync(TEST_CONFIG_DIR)
      }
      catch {
        // Ignore
      }
    }
    vi.restoreAllMocks()
  })

  it('should detect INF log level with user\'s exact configuration', async () => {
    // User's exact configuration from ~/.kfctl/errorDetector.json
    const userConfig: ErrorDetectorConfig = {
      skip: [
        {
          pattern: '(?:StatusCode|ResponseBody|Protocol|Method|Scheme|Path|QueryString|Duration)\\s*:',
          ignoreCase: true,
        },
      ],
      rules: [
        {
          type: 'logLevel',
          levels: ['ERR', 'FAT', 'INF'],
        },
        {
          type: 'regex',
          pattern: '\\[(ERROR|FATAL|CRITICAL|ERR|FAT)\\]',
          ignoreCase: true,
        },
        {
          type: 'keyword',
          pattern: 'EXCEPTION',
          ignoreCase: true,
        },
        {
          type: 'statusCode',
          min: 500,
          max: 599,
        },
        {
          type: 'stackTrace',
        },
      ],
      exclude: [
        {
          pattern: '"(errorCode|errorMessage|errorDetails|errorStack)"\\s*:',
          ignoreCase: true,
        },
      ],
    }

    // Write config to file (simulating user's ~/.kfctl/errorDetector.json)
    const configPath = path.join(TEST_KFCTL_DIR, 'errorDetector.json')
    fs.writeFileSync(configPath, JSON.stringify(userConfig), 'utf-8')

    // Load detector using loadErrorDetector (simulating app startup)
    vi.resetModules()
    const detector = await loadErrorDetector()

    // Test the exact log line from user's terminal
    const testLine = '[12:01:11.515 INF] Request and Response:'

    // This should be detected as an error
    expect(detector(testLine)).toBe(true)

    // Verify other log levels
    expect(detector('[12:01:11.515 ERR] Error occurred')).toBe(true)
    expect(detector('[12:01:11.515 FAT] Fatal error')).toBe(true)
    expect(detector('[12:01:11.515 INF] Normal log')).toBe(true) // INF should be detected
    expect(detector('[12:01:11.515 DBG] Debug message')).toBe(false) // DBG not in levels
    expect(detector('[12:01:11.515 WRN] Warning')).toBe(false) // WRN not in levels
  })

  it('should verify skip rules work correctly', async () => {
    const userConfig: ErrorDetectorConfig = {
      skip: [
        {
          pattern: '(?:StatusCode|ResponseBody|Protocol|Method|Scheme|Path|QueryString|Duration)\\s*:',
          ignoreCase: true,
        },
      ],
      rules: [
        {
          type: 'logLevel',
          levels: ['ERR', 'FAT', 'INF'],
        },
      ],
    }

    const configPath = path.join(TEST_KFCTL_DIR, 'errorDetector.json')
    fs.writeFileSync(configPath, JSON.stringify(userConfig), 'utf-8')

    vi.resetModules()
    const detector = await loadErrorDetector()

    // Lines matching skip pattern should be skipped
    expect(detector('StatusCode: 200')).toBe(false)
    expect(detector('ResponseBody: {"data": []}')).toBe(false)
    expect(detector('Protocol: HTTP/1.1')).toBe(false)

    // But "Request and Response:" doesn't match skip pattern, so should be detected
    const testLine = '[12:01:11.515 INF] Request and Response:'
    expect(detector(testLine)).toBe(true) // Should NOT be skipped
  })
})
