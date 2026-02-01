# Testing

This project uses **Cucumber** with **Gherkin** syntax for BDD (Behavior-Driven Development) testing.

## Running Tests

```bash
# Run all tests
pnpm test

# Run specific feature file
pnpm test features/error-handling.feature

# Run specific scenario (by line number)
pnpm test features/error-handling.feature:9
```

## Test Structure

```
features/
├── error-handling.feature      # Error collection and monitoring tests
├── log-filtering.feature       # Log filtering and search tests
└── step_definitions/
    ├── common.steps.ts         # Shared step definitions
    ├── error-mode.steps.ts     # Error mode specific steps
    ├── log-filtering.steps.ts  # Filtering specific steps
    └── support/
        └── world.ts            # Test context (KfcWorld)
```

## Test Reports

Test reports are generated in `reports/`:
- `cucumber-report.html` - Visual HTML report
- `cucumber-report.json` - JSON report for CI/CD integration

## Testing Approach

- **User-centric**: Feature files describe real user scenarios
- **Maintainable**: When UI changes, only step definitions need updates
- **TUI-focused**: Tests focus on user interaction flows, not UI component details

## Key Testing Patterns

### Dependency Injection

Components use dependency injection for testability:
- `stdoutWriter` - Mock stdout for capturing output
- `useInputHook` - Mock input handler for simulating key presses
- `followLogs` - Mock log stream
- `copyToClipboard` - Mock clipboard operations

### Mock Stdout Handling

The test world (`KfcWorld`) captures stdout writes and handles ANSI escape sequences (like `\x1Bc` for clearing screen) to simulate real terminal behavior.
