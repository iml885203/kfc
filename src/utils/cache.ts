import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const CACHE_FILE = path.join(os.homedir(), '.kfc_cache.json')

interface CacheData {
  deployments: Record<string, string[]>
}

let memoryCache: CacheData = { deployments: {} }
let isLoaded = false

function loadCache() {
  if (isLoaded)
    return
  try {
    if (fs.existsSync(CACHE_FILE)) {
      const content = fs.readFileSync(CACHE_FILE, 'utf-8')
      memoryCache = JSON.parse(content)
    }
  }
  catch {
  }
  isLoaded = true
}

function saveCache() {
  try {
    fs.writeFileSync(CACHE_FILE, JSON.stringify(memoryCache, null, 2))
  }
  catch {
  }
}

export function getCachedDeployments(context: string, namespace: string): string[] | null {
  loadCache()
  const key = `${context}:${namespace}`
  return memoryCache.deployments[key] || null
}

export function setCachedDeployments(context: string, namespace: string, deployments: string[]) {
  loadCache()
  const key = `${context}:${namespace}`
  memoryCache.deployments[key] = deployments
  saveCache()
}
