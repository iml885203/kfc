import type { ErrorDetector } from './errorDetector.js'
import { isStackTraceLine } from './errorDetector.js'

export interface ErrorDetectorConfig {
  rules: ErrorRule[]
  exclude?: ExcludeRule[]
  skip?: SkipRule[]
}

export interface ErrorRule {
  type: 'regex' | 'keyword' | 'logLevel' | 'statusCode' | 'stackTrace'
  pattern?: string
  ignoreCase?: boolean
  min?: number
  max?: number
  levels?: string[]
}

export interface ExcludeRule {
  pattern: string
  ignoreCase?: boolean
}

export interface SkipRule {
  pattern: string
  ignoreCase?: boolean
}

export function createDetectorFromConfig(config: ErrorDetectorConfig): ErrorDetector {
  return (line: string): boolean => {
    if (!line || typeof line !== 'string') {
      return false
    }

    if (config.skip) {
      for (const skipRule of config.skip) {
        const regex = new RegExp(skipRule.pattern, skipRule.ignoreCase ? 'i' : '')
        if (regex.test(line)) {
          return false
        }
      }
    }

    for (const rule of config.rules) {
      if (matchesRule(line, rule)) {
        if (config.exclude) {
          let excluded = false
          for (const excludeRule of config.exclude) {
            const regex = new RegExp(excludeRule.pattern, excludeRule.ignoreCase ? 'i' : '')
            if (regex.test(line)) {
              excluded = true
              break
            }
          }
          if (excluded) {
            continue
          }
        }
        return true
      }
    }

    return false
  }
}

function matchesRule(line: string, rule: ErrorRule): boolean {
  if (!line || typeof line !== 'string') {
    return false
  }

  switch (rule.type) {
    case 'regex':
      if (!rule.pattern) {
        return false
      }
      try {
        const regex = new RegExp(rule.pattern, rule.ignoreCase ? 'i' : '')
        return regex.test(line)
      }
      catch {
        return false
      }

    case 'keyword': {
      if (!rule.pattern) {
        return false
      }
      const searchText = rule.ignoreCase ? line.toLowerCase() : line
      const keyword = rule.ignoreCase ? rule.pattern.toLowerCase() : rule.pattern
      return searchText.includes(keyword)
    }

    case 'logLevel':
      if (rule.levels) {
        const levelsPattern = rule.levels.join('|')
        const regex = new RegExp(
          `\\[\\d{2}:\\d{2}:\\d{2}\\.\\d+\\s+(${levelsPattern})\\]`,
          rule.ignoreCase ? 'i' : '',
        )
        if (regex.test(line)) {
          return true
        }
      }
      if (rule.levels) {
        const levelsPattern = rule.levels.join('|')
        const regex = new RegExp(`\\[(${levelsPattern})\\]`, rule.ignoreCase ? 'i' : '')
        return regex.test(line)
      }
      return false

    case 'statusCode': {
      const statusMatch = line.match(/(?:StatusCode|"errorCode")\s*:\s*(\d+)/i)
      if (statusMatch) {
        const code = Number.parseInt(statusMatch[1], 10)
        const min = rule.min ?? 0
        const max = rule.max ?? 999
        return code >= min && code <= max
      }
      return false
    }

    case 'stackTrace':
      return isStackTraceLine(line)

    default:
      return false
  }
}

export const DEFAULT_ASPNET_CONFIG: ErrorDetectorConfig = {
  skip: [
    {
      pattern: '(?:StatusCode|ResponseBody|Protocol|Method|Scheme|Path|QueryString|Duration|Request and Response)\\s*:',
      ignoreCase: true,
    },
  ],
  rules: [
    {
      type: 'logLevel',
      levels: ['ERR', 'FATAL', 'CRITICAL'],
    },
    {
      type: 'regex',
      pattern: '\\[(ERROR|FATAL|CRITICAL|ERR)\\]',
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
