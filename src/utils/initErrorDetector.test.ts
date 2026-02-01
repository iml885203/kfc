import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_ASPNET_CONFIG } from './errorDetectorConfig.js'

describe('initErrorDetector', () => {
  const TEST_CONFIG_DIR = path.join(os.tmpdir(), `kfctl-init-test-${Date.now()}`)
  const TEST_KFCTL_DIR = path.join(TEST_CONFIG_DIR, '.kfctl')

  beforeEach(() => {
    vi.spyOn(os, 'homedir').mockReturnValue(TEST_CONFIG_DIR)

    const jsonPath = path.join(TEST_KFCTL_DIR, 'errorDetector.json')
    const jsPath = path.join(TEST_KFCTL_DIR, 'errorDetector.js')
    const tsPath = path.join(TEST_KFCTL_DIR, 'errorDetector.ts')

    if (fs.existsSync(jsonPath))
      fs.unlinkSync(jsonPath)
    if (fs.existsSync(jsPath))
      fs.unlinkSync(jsPath)
    if (fs.existsSync(tsPath))
      fs.unlinkSync(tsPath)

    if (!fs.existsSync(TEST_KFCTL_DIR)) {
      fs.mkdirSync(TEST_KFCTL_DIR, { recursive: true })
    }
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
      }
    }
    vi.restoreAllMocks()
  })

  describe('successful initialization', () => {
    it('should create errorDetector.json file when it does not exist', async () => {
      vi.resetModules()
      const jsonPath = path.join(TEST_KFCTL_DIR, 'errorDetector.json')
      const jsPath = path.join(TEST_KFCTL_DIR, 'errorDetector.js')
      const tsPath = path.join(TEST_KFCTL_DIR, 'errorDetector.ts')

      if (fs.existsSync(jsonPath))
        fs.unlinkSync(jsonPath)
      if (fs.existsSync(jsPath))
        fs.unlinkSync(jsPath)
      if (fs.existsSync(tsPath))
        fs.unlinkSync(tsPath)

      expect(fs.existsSync(jsonPath)).toBe(false)

      const { initErrorDetector } = await import('./initErrorDetector.js')
      const result = initErrorDetector()

      expect(result.success).toBe(true)
      expect(result.path).toBe(path.join(TEST_KFCTL_DIR, 'errorDetector.json'))
      expect(fs.existsSync(result.path)).toBe(true)
    })

    it('should create .kfctl directory if it does not exist', async () => {
      vi.resetModules()
      const jsonPath = path.join(TEST_KFCTL_DIR, 'errorDetector.json')
      if (fs.existsSync(jsonPath))
        fs.unlinkSync(jsonPath)

      if (fs.existsSync(TEST_KFCTL_DIR)) {
        const files = fs.readdirSync(TEST_KFCTL_DIR)
        files.forEach((file) => {
          fs.unlinkSync(path.join(TEST_KFCTL_DIR, file))
        })
        fs.rmdirSync(TEST_KFCTL_DIR)
      }

      const { initErrorDetector } = await import('./initErrorDetector.js')
      const result = initErrorDetector()

      expect(result.success).toBe(true)
      expect(fs.existsSync(TEST_KFCTL_DIR)).toBe(true)
      expect(fs.existsSync(result.path)).toBe(true)
    })

    it('should create JSON file with default ASP.NET Core configuration', async () => {
      vi.resetModules()
      const jsonPath = path.join(TEST_KFCTL_DIR, 'errorDetector.json')
      const jsPath = path.join(TEST_KFCTL_DIR, 'errorDetector.js')
      const tsPath = path.join(TEST_KFCTL_DIR, 'errorDetector.ts')
      if (fs.existsSync(jsonPath))
        fs.unlinkSync(jsonPath)
      if (fs.existsSync(jsPath))
        fs.unlinkSync(jsPath)
      if (fs.existsSync(tsPath))
        fs.unlinkSync(tsPath)

      const { initErrorDetector } = await import('./initErrorDetector.js')
      const result = initErrorDetector()

      expect(result.success).toBe(true)
      const content = fs.readFileSync(result.path, 'utf-8')
      const config = JSON.parse(content)

      expect(config.rules).toBeDefined()
      expect(config.rules).toEqual(DEFAULT_ASPNET_CONFIG.rules)
      expect(config.skip).toBeDefined()
      expect(config.skip).toEqual(DEFAULT_ASPNET_CONFIG.skip)
      expect(config.exclude).toBeDefined()
      expect(config.exclude).toEqual(DEFAULT_ASPNET_CONFIG.exclude)
    })

    it('should include metadata in JSON file', async () => {
      vi.resetModules()
      const jsonPath = path.join(TEST_KFCTL_DIR, 'errorDetector.json')
      const jsPath = path.join(TEST_KFCTL_DIR, 'errorDetector.js')
      const tsPath = path.join(TEST_KFCTL_DIR, 'errorDetector.ts')
      if (fs.existsSync(jsonPath))
        fs.unlinkSync(jsonPath)
      if (fs.existsSync(jsPath))
        fs.unlinkSync(jsPath)
      if (fs.existsSync(tsPath))
        fs.unlinkSync(tsPath)

      const { initErrorDetector } = await import('./initErrorDetector.js')
      const result = initErrorDetector()

      const content = fs.readFileSync(result.path, 'utf-8')
      const config = JSON.parse(content)

      expect(config.description).toBeDefined()
      expect(config.comment).toBeDefined()
    })

    it('should return success message with file path', async () => {
      vi.resetModules()
      const jsonPath = path.join(TEST_KFCTL_DIR, 'errorDetector.json')
      const jsPath = path.join(TEST_KFCTL_DIR, 'errorDetector.js')
      const tsPath = path.join(TEST_KFCTL_DIR, 'errorDetector.ts')
      if (fs.existsSync(jsonPath))
        fs.unlinkSync(jsonPath)
      if (fs.existsSync(jsPath))
        fs.unlinkSync(jsPath)
      if (fs.existsSync(tsPath))
        fs.unlinkSync(tsPath)

      const { initErrorDetector } = await import('./initErrorDetector.js')
      const result = initErrorDetector()

      expect(result.success).toBe(true)
      expect(result.message).toContain(result.path)
      expect(result.message).toContain('created')
    })
  })

  describe('when file already exists', () => {
    it('should return false when JSON file exists', async () => {
      vi.resetModules()
      const jsonPath = path.join(TEST_KFCTL_DIR, 'errorDetector.json')
      fs.writeFileSync(jsonPath, '{}', 'utf-8')

      const { initErrorDetector } = await import('./initErrorDetector.js')
      const result = initErrorDetector()

      expect(result.success).toBe(false)
      expect(result.message).toContain('already exists')
    })

    it('should return false when JavaScript file exists', async () => {
      vi.resetModules()
      const jsPath = path.join(TEST_KFCTL_DIR, 'errorDetector.js')
      fs.writeFileSync(jsPath, 'export const x = 1;', 'utf-8')

      const { initErrorDetector } = await import('./initErrorDetector.js')
      const result = initErrorDetector()

      expect(result.success).toBe(false)
      expect(result.message).toContain('already exists')
    })

    it('should return false when TypeScript file exists', async () => {
      vi.resetModules()
      const tsPath = path.join(TEST_KFCTL_DIR, 'errorDetector.ts')
      fs.writeFileSync(tsPath, 'export const x = 1;', 'utf-8')

      const { initErrorDetector } = await import('./initErrorDetector.js')
      const result = initErrorDetector()

      expect(result.success).toBe(false)
      expect(result.message).toContain('already exists')
    })

    it('should return message mentioning all possible file types', async () => {
      vi.resetModules()
      const jsonPath = path.join(TEST_KFCTL_DIR, 'errorDetector.json')
      fs.writeFileSync(jsonPath, '{}', 'utf-8')

      const { initErrorDetector } = await import('./initErrorDetector.js')
      const result = initErrorDetector()

      expect(result.message).toContain('errorDetector.json')
      expect(result.message).toContain('errorDetector.js')
      expect(result.message).toContain('errorDetector.ts')
    })
  })

  describe('file content validation', () => {
    it('should create valid JSON file', async () => {
      vi.resetModules()
      const jsonPath = path.join(TEST_KFCTL_DIR, 'errorDetector.json')
      if (fs.existsSync(jsonPath))
        fs.unlinkSync(jsonPath)

      const { initErrorDetector } = await import('./initErrorDetector.js')
      const result = initErrorDetector()

      const content = fs.readFileSync(result.path, 'utf-8')
      expect(() => JSON.parse(content)).not.toThrow()
    })

    it('should create properly formatted JSON (with indentation)', async () => {
      vi.resetModules()
      const jsonPath = path.join(TEST_KFCTL_DIR, 'errorDetector.json')
      if (fs.existsSync(jsonPath))
        fs.unlinkSync(jsonPath)

      const { initErrorDetector } = await import('./initErrorDetector.js')
      const result = initErrorDetector()

      const content = fs.readFileSync(result.path, 'utf-8')
      expect(content).toContain('\n  ')
      expect(content).toContain('\n    ')
    })

    it('should include all required configuration fields', async () => {
      vi.resetModules()
      const jsonPath = path.join(TEST_KFCTL_DIR, 'errorDetector.json')
      if (fs.existsSync(jsonPath))
        fs.unlinkSync(jsonPath)

      const { initErrorDetector } = await import('./initErrorDetector.js')
      const result = initErrorDetector()

      const content = fs.readFileSync(result.path, 'utf-8')
      const config = JSON.parse(content)

      expect(config.rules).toBeDefined()
      expect(Array.isArray(config.rules)).toBe(true)
      expect(config.skip).toBeDefined()
      expect(Array.isArray(config.skip)).toBe(true)
      expect(config.exclude).toBeDefined()
      expect(Array.isArray(config.exclude)).toBe(true)
    })
  })
})
