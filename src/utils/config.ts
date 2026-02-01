import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const CONFIG_FILE = path.join(os.homedir(), '.kfc-config.json')

interface Config {
  defaultNamespace?: string
}

export function loadConfig(): Config {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const content = fs.readFileSync(CONFIG_FILE, 'utf-8')
      return JSON.parse(content)
    }
  }
  catch {
  }
  return {}
}

export function saveConfig(config: Config): void {
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8')
  }
  catch (error) {
    console.error('Failed to save config:', error)
  }
}

export function getDefaultNamespace(): string | undefined {
  return loadConfig().defaultNamespace
}

export function setDefaultNamespace(namespace: string): void {
  const config = loadConfig()
  config.defaultNamespace = namespace
  saveConfig(config)
}
