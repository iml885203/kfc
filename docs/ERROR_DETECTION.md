# Custom Error Detection

KFC supports custom error detection to match your application's logging format.

## Quick Start

```bash
# Create configuration template
kfctl --init-error-detector

# Edit ~/.kfctl/errorDetector.json
# KFC will automatically use your configuration
```

## Configuration Methods

KFC supports two configuration formats, loaded in priority order (first found is used):

1. **JSON Configuration** (Recommended) - Simple, declarative rules
   - File: `~/.kfctl/errorDetector.json`
   - See [JSON Configuration Guide](ERROR_DETECTION_JSON.md)

2. **JavaScript** - Full programming flexibility
   - File: `~/.kfctl/errorDetector.js`
   - Best for complex logic

**Note**: TypeScript files (`.ts`) need compilation. Use `.js` or `.json` instead.

## JavaScript Example

```javascript
// ~/.kfctl/errorDetector.js
export function errorDetector(line) {
  // ASP.NET Core format: [HH:mm:ss.fff ERR]
  if (/\[\d{2}:\d{2}:\d{2}\.\d+\s+(ERR|FATAL|CRITICAL)\]/.test(line)) {
    return true
  }

  // Standard format: [ERROR], [FATAL]
  if (/\[(ERROR|FATAL|CRITICAL|ERR)\]/i.test(line)) {
    return true
  }

  return false
}
```

## Default Behavior

If no custom configuration is found, KFC detects errors based on:
- Log level markers: `[ERROR]`, `[FATAL]`, `[CRITICAL]`
- Error keywords: `ERROR`, `FATAL`, `EXCEPTION`
- Stack traces
- HTTP 5xx server errors

## Troubleshooting

**Custom detector not being used:**
- Check file exists at `~/.kfctl/errorDetector.json` or `~/.kfctl/errorDetector.js`
- Verify file exports `errorDetector` function
- Check console for error messages
