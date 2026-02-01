import antfu from '@antfu/eslint-config'

export default antfu({
  // TypeScript and React are auto-detected
  typescript: true,
  react: true,

  // Ignore test-related files
  ignores: [
    'dist/',
    'node_modules/',
    'reports/',
    'features/',
    'cucumber.js',
  ],
})
