# Error Detection with JSON Configuration

JSON-based error detection configuration for simple and declarative error detection rules.

## Quick Start

```bash
# Create JSON configuration template
kfctl --init-error-detector

# Edit ~/.kfctl/errorDetector.json
# KFC will automatically use your configuration
```

## Configuration Format

```json
{
  "rules": [
    {
      "type": "logLevel",
      "levels": ["ERR", "FATAL", "CRITICAL"]
    },
    {
      "type": "regex",
      "pattern": "\\[ERROR\\]",
      "ignoreCase": true
    },
    {
      "type": "keyword",
      "pattern": "EXCEPTION",
      "ignoreCase": true
    },
    {
      "type": "statusCode",
      "min": 500,
      "max": 599
    },
    {
      "type": "stackTrace"
    }
  ],
  "exclude": [
    {
      "pattern": "\"(errorCode|errorMessage)\"\\s*:",
      "ignoreCase": true
    }
  ],
  "skip": [
    {
      "pattern": "(?:StatusCode|ResponseBody|Protocol)\\s*:",
      "ignoreCase": true
    }
  ]
}
```

## Rule Types

### `regex` - Regular Expression Matching

```json
{
  "type": "regex",
  "pattern": "\\[ERROR\\]",
  "ignoreCase": false
}
```

### `keyword` - Keyword Matching

```json
{
  "type": "keyword",
  "pattern": "EXCEPTION",
  "ignoreCase": true
}
```

### `logLevel` - Log Level Markers

Matches ASP.NET Core format `[HH:mm:ss.fff ERR]` or standard format `[ERROR]`:

```json
{
  "type": "logLevel",
  "levels": ["ERR", "FATAL", "CRITICAL"]
}
```

### `statusCode` - HTTP Status Code

```json
{
  "type": "statusCode",
  "min": 500,
  "max": 599
}
```

Matches `StatusCode: 500` or `"errorCode": 503`.

### `stackTrace` - Stack Trace Detection

```json
{
  "type": "stackTrace"
}
```

## Exclude Rules

Exclude patterns that would otherwise match:

```json
{
  "exclude": [
    {
      "pattern": "\"errorCode\"\\s*:\\s*[01]",
      "ignoreCase": true
    }
  ]
}
```

## Skip Rules

Skip entire lines (don't check for errors):

```json
{
  "skip": [
    {
      "pattern": "(?:StatusCode|ResponseBody|Protocol)\\s*:",
      "ignoreCase": true
    }
  ]
}
```

## Example: ASP.NET Core Configuration

This is the default configuration created by `--init-error-detector`, suitable for ASP.NET Core applications:

```json
{
  "skip": [
    {
      "pattern": "(?:StatusCode|ResponseBody|Protocol|Method|Scheme|Path|QueryString|Duration|Request and Response)\\s*:",
      "ignoreCase": true
    }
  ],
  "rules": [
    {
      "type": "logLevel",
      "levels": ["ERR", "FATAL", "CRITICAL"]
    },
    {
      "type": "regex",
      "pattern": "\\[(ERROR|FATAL|CRITICAL|ERR)\\]",
      "ignoreCase": true
    },
    {
      "type": "keyword",
      "pattern": "EXCEPTION",
      "ignoreCase": true
    },
    {
      "type": "statusCode",
      "min": 500,
      "max": 599
    },
    {
      "type": "stackTrace"
    }
  ],
  "exclude": [
    {
      "pattern": "\"(errorCode|errorMessage|errorDetails|errorStack)\"\\s*:",
      "ignoreCase": true
    }
  ]
}
```

## Rule Execution Order

1. **skip** - Check first, skip entire line if matched
2. **rules** - Check if any rule matches (OR logic)
3. **exclude** - If rule matches, check if excluded
