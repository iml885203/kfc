/**
 * Unit tests for error detector configuration
 */

import type { ErrorDetectorConfig } from './errorDetectorConfig.js'
import { describe, expect, it } from 'vitest'
import { createDetectorFromConfig, DEFAULT_ASPNET_CONFIG } from './errorDetectorConfig.js'

describe('errorDetectorConfig', () => {
  describe('regex rule', () => {
    it('should match lines with regex pattern', () => {
      const config: ErrorDetectorConfig = {
        rules: [
          {
            type: 'regex',
            pattern: '\\[ERROR\\]',
          },
        ],
      }
      const detector = createDetectorFromConfig(config)

      expect(detector('[ERROR] Something went wrong')).toBe(true)
      expect(detector('[INFO] Normal log')).toBe(false)
    })

    it('should support case-insensitive matching', () => {
      const config: ErrorDetectorConfig = {
        rules: [
          {
            type: 'regex',
            pattern: 'error',
            ignoreCase: true,
          },
        ],
      }
      const detector = createDetectorFromConfig(config)

      expect(detector('ERROR occurred')).toBe(true)
      expect(detector('Error occurred')).toBe(true)
      expect(detector('error occurred')).toBe(true)
    })

    it('should handle invalid regex gracefully', () => {
      const config: ErrorDetectorConfig = {
        rules: [
          {
            type: 'regex',
            pattern: '[unclosed',
          },
        ],
      }
      const detector = createDetectorFromConfig(config)

      // Should not throw, but return false for invalid regex
      expect(detector('any line')).toBe(false)
    })
  })

  describe('keyword rule', () => {
    it('should match lines containing keyword', () => {
      const config: ErrorDetectorConfig = {
        rules: [
          {
            type: 'keyword',
            pattern: 'EXCEPTION',
            ignoreCase: true,
          },
        ],
      }
      const detector = createDetectorFromConfig(config)

      expect(detector('NullReferenceException occurred')).toBe(true)
      expect(detector('Normal log message')).toBe(false)
    })

    it('should support case-insensitive keyword matching', () => {
      const config: ErrorDetectorConfig = {
        rules: [
          {
            type: 'keyword',
            pattern: 'exception',
            ignoreCase: true,
          },
        ],
      }
      const detector = createDetectorFromConfig(config)

      expect(detector('EXCEPTION')).toBe(true)
      expect(detector('Exception')).toBe(true)
      expect(detector('exception')).toBe(true)
    })
  })

  describe('logLevel rule', () => {
    it('should match ASP.NET Core log level format', () => {
      const config: ErrorDetectorConfig = {
        rules: [
          {
            type: 'logLevel',
            levels: ['ERR', 'FATAL'],
          },
        ],
      }
      const detector = createDetectorFromConfig(config)

      expect(detector('[10:22:52.529 ERR] Error occurred')).toBe(true)
      expect(detector('[10:22:52.529 FATAL] Fatal error')).toBe(true)
      expect(detector('[10:22:52.529 INF] Normal log')).toBe(false)
    })

    it('should match standard log level format', () => {
      const config: ErrorDetectorConfig = {
        rules: [
          {
            type: 'logLevel',
            levels: ['ERROR', 'FATAL'],
          },
        ],
      }
      const detector = createDetectorFromConfig(config)

      expect(detector('[ERROR] Something wrong')).toBe(true)
      expect(detector('[FATAL] Critical issue')).toBe(true)
      expect(detector('[INFO] Normal')).toBe(false)
    })
  })

  describe('statusCode rule', () => {
    it('should match status codes in range', () => {
      const config: ErrorDetectorConfig = {
        rules: [
          {
            type: 'statusCode',
            min: 500,
            max: 599,
          },
        ],
      }
      const detector = createDetectorFromConfig(config)

      expect(detector('StatusCode: 500')).toBe(true)
      expect(detector('StatusCode: 503')).toBe(true)
      expect(detector('StatusCode: 599')).toBe(true)
      expect(detector('StatusCode: 499')).toBe(false)
      expect(detector('StatusCode: 600')).toBe(false)
    })

    it('should match errorCode in JSON', () => {
      const config: ErrorDetectorConfig = {
        rules: [
          {
            type: 'statusCode',
            min: 500,
            max: 599,
          },
        ],
      }
      const detector = createDetectorFromConfig(config)

      expect(detector('ResponseBody: {"errorCode":500}')).toBe(true)
      expect(detector('ResponseBody: {"errorCode":503}')).toBe(true)
      expect(detector('ResponseBody: {"errorCode":200}')).toBe(false)
    })
  })

  describe('stackTrace rule', () => {
    it('should detect stack trace patterns', () => {
      const config: ErrorDetectorConfig = {
        rules: [
          {
            type: 'stackTrace',
          },
        ],
      }
      const detector = createDetectorFromConfig(config)

      expect(detector('    at System.Exception.Throw()')).toBe(true)
      expect(detector('File "app.py", line 42')).toBe(true)
      expect(detector('Normal log line')).toBe(false)
    })
  })

  describe('exclude rules', () => {
    it('should exclude matched patterns', () => {
      const config: ErrorDetectorConfig = {
        rules: [
          {
            type: 'keyword',
            pattern: 'ERROR',
            ignoreCase: true,
          },
        ],
        exclude: [
          {
            pattern: '"errorCode"\\s*:\\s*[01]',
            ignoreCase: true,
          },
        ],
      }
      const detector = createDetectorFromConfig(config)

      expect(detector('ERROR occurred')).toBe(true)
      expect(detector('{"errorCode":0}')).toBe(false) // Excluded
      expect(detector('{"errorCode":1}')).toBe(false) // Excluded
      expect(detector('{"errorCode":2}')).toBe(true) // Not excluded
    })
  })

  describe('skip rules', () => {
    it('should skip lines matching skip patterns', () => {
      const config: ErrorDetectorConfig = {
        skip: [
          {
            pattern: 'StatusCode:\\s*\\d+',
            ignoreCase: true,
          },
        ],
        rules: [
          {
            type: 'keyword',
            pattern: 'ERROR',
          },
        ],
      }
      const detector = createDetectorFromConfig(config)

      expect(detector('ERROR occurred')).toBe(true)
      expect(detector('StatusCode: 500')).toBe(false) // Skipped entirely
      expect(detector('StatusCode: 200')).toBe(false) // Skipped entirely
    })
  })

  describe('rule combination (OR logic)', () => {
    it('should match if any rule matches', () => {
      const config: ErrorDetectorConfig = {
        rules: [
          {
            type: 'keyword',
            pattern: 'ERROR',
          },
          {
            type: 'keyword',
            pattern: 'FATAL',
          },
        ],
      }
      const detector = createDetectorFromConfig(config)

      expect(detector('ERROR occurred')).toBe(true)
      expect(detector('FATAL error')).toBe(true)
      expect(detector('Normal log')).toBe(false)
    })
  })

  describe('dEFAULT_ASPNET_CONFIG', () => {
    it('should detect ASP.NET Core error logs', () => {
      const detector = createDetectorFromConfig(DEFAULT_ASPNET_CONFIG)

      expect(detector('[10:22:52.529 ERR] Database connection failed')).toBe(true)
      expect(detector('[10:22:52.530 FATAL] System crash')).toBe(true)
      expect(detector('[10:22:52.531 INF] Normal log')).toBe(false)
    })

    it('should skip HTTP logging lines', () => {
      const detector = createDetectorFromConfig(DEFAULT_ASPNET_CONFIG)

      expect(detector('StatusCode: 401')).toBe(false)
      expect(detector('ResponseBody: {"data":"test"}')).toBe(false)
      expect(detector('Protocol: HTTP/1.1')).toBe(false)
    })

    it('should skip HTTP logging lines (including ResponseBody)', () => {
      const detector = createDetectorFromConfig(DEFAULT_ASPNET_CONFIG)

      // ResponseBody lines are skipped entirely by skip rule
      // This matches the behavior: HTTP logging metadata is skipped
      expect(detector('ResponseBody: {"errorCode":500}')).toBe(false) // Skipped
      expect(detector('ResponseBody: {"errorCode":503}')).toBe(false) // Skipped
      expect(detector('ResponseBody: {"errorCode":401}')).toBe(false) // Skipped
    })

    it('should exclude JSON field names', () => {
      const detector = createDetectorFromConfig(DEFAULT_ASPNET_CONFIG)

      expect(detector('EXCEPTION occurred')).toBe(true)
      expect(detector('{"errorCode":1}')).toBe(false) // Excluded
      expect(detector('{"errorMessage":"test"}')).toBe(false) // Excluded
    })
  })

  describe('edge cases', () => {
    it('should handle undefined line gracefully', () => {
      const detector = createDetectorFromConfig(DEFAULT_ASPNET_CONFIG)
      // @ts-expect-error - testing runtime behavior with invalid input
      expect(detector(undefined)).toBe(false)
    })

    it('should handle null line gracefully', () => {
      const detector = createDetectorFromConfig(DEFAULT_ASPNET_CONFIG)
      // @ts-expect-error - testing runtime behavior with invalid input
      expect(detector(null)).toBe(false)
    })

    it('should handle empty string', () => {
      const detector = createDetectorFromConfig(DEFAULT_ASPNET_CONFIG)
      expect(detector('')).toBe(false)
    })

    it('should handle non-string input gracefully', () => {
      const detector = createDetectorFromConfig(DEFAULT_ASPNET_CONFIG)
      // @ts-expect-error - testing runtime behavior with invalid input
      expect(detector(123)).toBe(false)
      // @ts-expect-error - testing runtime behavior with invalid input
      expect(detector({})).toBe(false)
    })
  })
})
