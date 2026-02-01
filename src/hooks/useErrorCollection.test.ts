/**
 * Unit tests for useErrorCollection hook
 * Tests error detection with custom error detector
 *
 * This test reproduces the user's issue where INF log level
 * is configured but not detected in the application
 */

import type { ErrorDetectorConfig } from '../utils/errorDetectorConfig.js'
import { describe, expect, it } from 'vitest'
import { createDetectorFromConfig } from '../utils/errorDetectorConfig.js'

describe('useErrorCollection - INF log level detection issue', () => {
  it('should detect INF log level when configured (reproduce user issue)', () => {
    // Simulate the user's exact configuration
    const config: ErrorDetectorConfig = {
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

    const detector = createDetectorFromConfig(config)

    // Test the exact log line from user's terminal
    const testLine = '[12:01:11.515 INF] Request and Response:'

    // This should be detected as an error because INF is in the levels array
    // and "Request and Response:" doesn't match the skip pattern
    expect(detector(testLine)).toBe(true)

    // Test other cases
    expect(detector('[12:01:11.515 ERR] Test error')).toBe(true)
    expect(detector('[12:01:11.515 FAT] Fatal error')).toBe(true)
    expect(detector('[12:01:11.515 INF] Normal log message')).toBe(true) // INF should be detected
    expect(detector('[12:01:11.515 DBG] Debug message')).toBe(false) // DBG not in levels
  })

  it('should respect skip rules - Request and Response should NOT be skipped with current config', () => {
    // User's current config doesn't have "Request and Response" in skip pattern
    const config: ErrorDetectorConfig = {
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

    const detector = createDetectorFromConfig(config)

    // This line should NOT be skipped because "Request and Response:" doesn't match skip pattern
    const testLine = '[12:01:11.515 INF] Request and Response:'
    expect(detector(testLine)).toBe(true) // Should be detected

    // But this line should be skipped (matches skip pattern)
    const skippedLine = 'StatusCode: 200'
    expect(detector(skippedLine)).toBe(false) // Should be skipped
  })

  it('should detect INF even when skip pattern includes Request and Response', () => {
    // Test with "Request and Response" in skip pattern (like it was before)
    const config: ErrorDetectorConfig = {
      skip: [
        {
          pattern: '(?:StatusCode|ResponseBody|Protocol|Method|Scheme|Path|QueryString|Duration|Request and Response)\\s*:',
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

    const detector = createDetectorFromConfig(config)

    // This line SHOULD be skipped because "Request and Response:" matches skip pattern
    const testLine = '[12:01:11.515 INF] Request and Response:'
    expect(detector(testLine)).toBe(false) // Should be skipped

    // But this line should be detected (no skip pattern match)
    const normalLine = '[12:01:11.515 INF] Normal log message'
    expect(detector(normalLine)).toBe(true) // Should be detected
  })
})
