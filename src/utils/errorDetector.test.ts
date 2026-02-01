/**
 * Unit tests for error detector utilities
 */

import { describe, expect, it } from 'vitest'
import {
  aspNetCoreErrorDetector,
  defaultErrorDetector,
  extractErrorSeverity,
  extractErrorType,
  extractTimestamp,
  isStackTraceLine,
} from './errorDetector.js'

describe('defaultErrorDetector', () => {
  describe('edge cases', () => {
    it('should handle undefined line gracefully', () => {
      // @ts-expect-error - testing runtime behavior with invalid input
      expect(defaultErrorDetector(undefined)).toBe(false)
    })

    it('should handle null line gracefully', () => {
      // @ts-expect-error - testing runtime behavior with invalid input
      expect(defaultErrorDetector(null)).toBe(false)
    })

    it('should handle empty string', () => {
      expect(defaultErrorDetector('')).toBe(false)
    })

    it('should handle non-string input gracefully', () => {
      // @ts-expect-error - testing runtime behavior with invalid input
      expect(defaultErrorDetector(123)).toBe(false)
      // @ts-expect-error - testing runtime behavior with invalid input
      expect(defaultErrorDetector({})).toBe(false)
    })
  })

  describe('log level markers', () => {
    it('should detect ASP.NET Core log level format', () => {
      expect(defaultErrorDetector('[10:22:52.529 ERR] Error occurred')).toBe(true)
      expect(defaultErrorDetector('[10:22:52.530 FATAL] Fatal error')).toBe(true)
      expect(defaultErrorDetector('[10:22:52.531 CRITICAL] Critical issue')).toBe(true)
      expect(defaultErrorDetector('[10:22:52.532 INF] Normal log')).toBe(false)
      expect(defaultErrorDetector('[10:22:52.533 DBG] Debug message')).toBe(false)
    })

    it('should detect standard log level format', () => {
      expect(defaultErrorDetector('[ERROR] Something went wrong')).toBe(true)
      expect(defaultErrorDetector('[FATAL] Critical error')).toBe(true)
      expect(defaultErrorDetector('[CRITICAL] Critical issue')).toBe(true)
      expect(defaultErrorDetector('[ERR] Error occurred')).toBe(true)
      expect(defaultErrorDetector('[INFO] Normal log')).toBe(false)
    })
  })

  describe('error keywords', () => {
    it('should detect error keywords', () => {
      expect(defaultErrorDetector('ERROR occurred')).toBe(true)
      expect(defaultErrorDetector('FATAL error')).toBe(true)
      expect(defaultErrorDetector('CRITICAL issue')).toBe(true)
      expect(defaultErrorDetector('EXCEPTION thrown')).toBe(true)
      expect(defaultErrorDetector('UNHANDLED EXCEPTION')).toBe(true)
      expect(defaultErrorDetector('Normal log message')).toBe(false)
    })

    it('should exclude JSON field names', () => {
      expect(defaultErrorDetector('{"errorCode": 500}')).toBe(false)
      expect(defaultErrorDetector('{"errorMessage": "test"}')).toBe(false)
      expect(defaultErrorDetector('{"errorDetails": {}}')).toBe(false)
      expect(defaultErrorDetector('{"errorStack": "trace"}')).toBe(false)
      expect(defaultErrorDetector('ERROR occurred')).toBe(true) // Not JSON field
    })
  })

  describe('hTTP logging', () => {
    it('should skip HTTP logging lines', () => {
      expect(defaultErrorDetector('StatusCode: 200')).toBe(false)
      expect(defaultErrorDetector('StatusCode: 401')).toBe(false)
      expect(defaultErrorDetector('StatusCode: 404')).toBe(false)
      expect(defaultErrorDetector('ResponseBody: {"data": []}')).toBe(false)
      expect(defaultErrorDetector('Protocol: HTTP/1.1')).toBe(false)
      expect(defaultErrorDetector('Method: GET')).toBe(false)
      expect(defaultErrorDetector('Scheme: https')).toBe(false)
      expect(defaultErrorDetector('Path: /api/users')).toBe(false)
      expect(defaultErrorDetector('QueryString: ?id=123')).toBe(false)
      expect(defaultErrorDetector('Duration: 123ms')).toBe(false)
    })

    it('should detect 5xx server errors in ResponseBody', () => {
      expect(defaultErrorDetector('ResponseBody: {"errorCode":500}')).toBe(true)
      expect(defaultErrorDetector('ResponseBody: {"errorCode":503}')).toBe(true)
      expect(defaultErrorDetector('ResponseBody: {"errorCode":599}')).toBe(true)
      expect(defaultErrorDetector('ResponseBody: {"errorCode":499}')).toBe(false)
      expect(defaultErrorDetector('ResponseBody: {"errorCode":200}')).toBe(false)
    })
  })

  describe('failed keyword', () => {
    it('should detect FAILED keyword', () => {
      expect(defaultErrorDetector('Operation FAILED')).toBe(true)
      expect(defaultErrorDetector('Connection FAILED')).toBe(true)
      expect(defaultErrorDetector('FAILED to connect')).toBe(true)
    })

    it('should not detect FAILED in success context', () => {
      expect(defaultErrorDetector('Operation SUCCESS')).toBe(false)
      expect(defaultErrorDetector('SUCCEEDED')).toBe(false)
      expect(defaultErrorDetector('Operation OK')).toBe(false)
      expect(defaultErrorDetector('COMPLETED successfully')).toBe(false)
      // If line contains both SUCCESS and FAILED, it's not detected (SUCCESS takes precedence)
      expect(defaultErrorDetector('Operation SUCCESS but FAILED later')).toBe(false)
      // Only FAILED without success keywords should be detected
      expect(defaultErrorDetector('Operation FAILED')).toBe(true)
    })
  })

  describe('stack traces', () => {
    it('should detect stack trace patterns', () => {
      expect(defaultErrorDetector('    at System.Exception.Throw()')).toBe(true)
      expect(defaultErrorDetector('File "app.py", line 42')).toBe(true)
      expect(defaultErrorDetector('at Object.<anonymous> (file.js:10:5)')).toBe(true)
      expect(defaultErrorDetector('Normal log line')).toBe(false)
    })
  })
})

describe('aspNetCoreErrorDetector', () => {
  describe('aSP.NET Core log levels', () => {
    it('should detect ERR, FATAL, CRITICAL levels', () => {
      expect(aspNetCoreErrorDetector('[10:22:52.529 ERR] Error occurred')).toBe(true)
      expect(aspNetCoreErrorDetector('[10:22:52.530 FATAL] Fatal error')).toBe(true)
      expect(aspNetCoreErrorDetector('[10:22:52.531 CRITICAL] Critical issue')).toBe(true)
      expect(aspNetCoreErrorDetector('[10:22:52.532 INF] Normal log')).toBe(false)
      expect(aspNetCoreErrorDetector('[10:22:52.533 DBG] Debug message')).toBe(false)
      expect(aspNetCoreErrorDetector('[10:22:52.534 WRN] Warning')).toBe(false)
    })
  })

  describe('hTTP logging', () => {
    it('should skip HTTP logging lines', () => {
      expect(aspNetCoreErrorDetector('StatusCode: 200')).toBe(false)
      expect(aspNetCoreErrorDetector('ResponseBody: {"data": []}')).toBe(false)
      expect(aspNetCoreErrorDetector('Protocol: HTTP/1.1')).toBe(false)
      expect(aspNetCoreErrorDetector('Method: GET')).toBe(false)
      expect(aspNetCoreErrorDetector('Scheme: https')).toBe(false)
      expect(aspNetCoreErrorDetector('Path: /api/users')).toBe(false)
      expect(aspNetCoreErrorDetector('QueryString: ?id=123')).toBe(false)
      expect(aspNetCoreErrorDetector('Duration: 123ms')).toBe(false)
      expect(aspNetCoreErrorDetector('Request and Response:')).toBe(false)
    })

    it('should detect 5xx server errors in ResponseBody', () => {
      expect(aspNetCoreErrorDetector('ResponseBody: {"errorCode":500}')).toBe(true)
      expect(aspNetCoreErrorDetector('ResponseBody: {"errorCode":503}')).toBe(true)
      expect(aspNetCoreErrorDetector('ResponseBody: {"errorCode":200}')).toBe(false)
    })
  })

  describe('standard error markers', () => {
    it('should detect standard error markers', () => {
      expect(aspNetCoreErrorDetector('[ERROR] Something wrong')).toBe(true)
      expect(aspNetCoreErrorDetector('[FATAL] Critical')).toBe(true)
      expect(aspNetCoreErrorDetector('[CRITICAL] Issue')).toBe(true)
      expect(aspNetCoreErrorDetector('[ERR] Error')).toBe(true)
    })
  })

  describe('exceptions', () => {
    it('should detect exception keywords', () => {
      expect(aspNetCoreErrorDetector('NullReferenceException occurred')).toBe(true)
      expect(aspNetCoreErrorDetector('UNHANDLED EXCEPTION')).toBe(true)
      expect(aspNetCoreErrorDetector('Exception thrown')).toBe(true)
      expect(aspNetCoreErrorDetector('An EXCEPTION was raised')).toBe(true)
      expect(aspNetCoreErrorDetector('NullReferenceException')).toBe(true)
    })

    it('should exclude JSON field names', () => {
      expect(aspNetCoreErrorDetector('{"errorCode": 1}')).toBe(false)
      expect(aspNetCoreErrorDetector('{"errorMessage": "test"}')).toBe(false)
      expect(aspNetCoreErrorDetector('{"errorDetails": {}}')).toBe(false)
      expect(aspNetCoreErrorDetector('{"errorStack": "trace"}')).toBe(false)
    })
  })

  describe('stack traces', () => {
    it('should detect stack trace patterns', () => {
      expect(aspNetCoreErrorDetector('    at System.Exception.Throw()')).toBe(true)
      expect(aspNetCoreErrorDetector('File "app.py", line 42')).toBe(true)
      expect(aspNetCoreErrorDetector('at Object.<anonymous> (file.js:10:5)')).toBe(true)
    })
  })

  describe('edge cases', () => {
    it('should handle undefined line gracefully', () => {
      // @ts-expect-error - testing runtime behavior with invalid input
      expect(aspNetCoreErrorDetector(undefined)).toBe(false)
    })

    it('should handle null line gracefully', () => {
      // @ts-expect-error - testing runtime behavior with invalid input
      expect(aspNetCoreErrorDetector(null)).toBe(false)
    })

    it('should handle empty string', () => {
      expect(aspNetCoreErrorDetector('')).toBe(false)
    })
  })
})

describe('extractErrorSeverity', () => {
  it('should extract FATAL severity', () => {
    expect(extractErrorSeverity('[FATAL] Critical error')).toBe('FATAL')
    expect(extractErrorSeverity('FATAL error occurred')).toBe('FATAL')
  })

  it('should extract CRITICAL severity', () => {
    expect(extractErrorSeverity('CRITICAL issue')).toBe('CRITICAL')
  })

  it('should extract EXCEPTION severity', () => {
    expect(extractErrorSeverity('NullReferenceException')).toBe('EXCEPTION')
    expect(extractErrorSeverity('Exception thrown')).toBe('EXCEPTION')
  })

  it('should default to ERROR', () => {
    expect(extractErrorSeverity('[ERROR] Something wrong')).toBe('ERROR')
    expect(extractErrorSeverity('Error occurred')).toBe('ERROR')
    expect(extractErrorSeverity('Normal log')).toBe('ERROR')
  })
})

describe('extractErrorType', () => {
  it('should extract exception types', () => {
    expect(extractErrorType('NullReferenceException occurred')).toBe('NullReferenceException')
    expect(extractErrorType('TimeoutException thrown')).toBe('TimeoutException')
    expect(extractErrorType('ArgumentException: invalid')).toBe('ArgumentException')
  })

  it('should detect common error patterns', () => {
    expect(extractErrorType('Connection timeout occurred')).toBe('Timeout')
    expect(extractErrorType('Connection failed')).toBe('ConnectionError')
    expect(extractErrorType('Null reference error')).toBe('NullReference')
    // Database should be checked before connection (more specific)
    expect(extractErrorType('Database connection failed')).toBe('DatabaseError')
    expect(extractErrorType('Unauthorized access')).toBe('AuthorizationError')
    expect(extractErrorType('Forbidden resource')).toBe('AuthorizationError')
  })

  it('should default to Error', () => {
    expect(extractErrorType('Some error occurred')).toBe('Error')
    expect(extractErrorType('[ERROR] Unknown issue')).toBe('Error')
  })
})

describe('isStackTraceLine', () => {
  it('should detect Java/C# stack trace patterns', () => {
    expect(isStackTraceLine('    at System.Exception.Throw()')).toBe(true)
    expect(isStackTraceLine('at com.example.Class.method(File.java:42)')).toBe(true)
    expect(isStackTraceLine('   at MyClass.DoSomething()')).toBe(true)
  })

  it('should detect Python stack trace patterns', () => {
    expect(isStackTraceLine('File "app.py", line 42')).toBe(true)
    expect(isStackTraceLine('File "/path/to/file.py", line 10')).toBe(true)
  })

  it('should detect JavaScript stack trace patterns', () => {
    expect(isStackTraceLine('at Object.<anonymous> (file.js:10:5)')).toBe(true)
    expect(isStackTraceLine('at Function.call (index.js:20:15)')).toBe(true)
  })

  it('should detect generic indented continuation', () => {
    expect(isStackTraceLine('        at some.method()')).toBe(true)
    expect(isStackTraceLine('    (some context)')).toBe(true)
  })

  it('should not detect normal log lines', () => {
    expect(isStackTraceLine('Normal log message')).toBe(false)
    expect(isStackTraceLine('[ERROR] Something wrong')).toBe(false)
    expect(isStackTraceLine('at the end of line')).toBe(false) // Not at start
  })
})

describe('extractTimestamp', () => {
  it('should extract [HH:mm:ss.fff] format', () => {
    const result = extractTimestamp('[10:22:52.529 ERR] Error occurred')
    expect(result).toBe('10:22:52.529')
  })

  it('should extract HH:mm:ss.fff format', () => {
    const result = extractTimestamp('10:22:52.529 Error occurred')
    expect(result).toBe('10:22:52.529')
  })

  it('should extract HH:mm:ss format', () => {
    const result = extractTimestamp('10:22:52 Error occurred')
    expect(result).toBe('10:22:52')
  })

  it('should extract ISO format', () => {
    const result = extractTimestamp('2024-01-15T10:22:52 Error occurred')
    expect(result).toBe('2024-01-15T10:22:52')
  })

  it('should return current time for lines without timestamp', () => {
    const result = extractTimestamp('No timestamp here')
    // Should return a time string in HH:mm:ss.fff format
    expect(result).toMatch(/^\d{2}:\d{2}:\d{2}\.\d{3}$/)
  })

  it('should extract first matching timestamp', () => {
    const result = extractTimestamp('[10:22:52.529] [10:30:00.000] Multiple timestamps')
    expect(result).toBe('10:22:52.529')
  })
})
