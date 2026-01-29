import fs from 'fs';
import path from 'path';
import os from 'os';
const CACHE_FILE = path.join(os.homedir(), '.kfc_cache.json');
let memoryCache = { deployments: {} };
let isLoaded = false;
function loadCache() {
    if (isLoaded)
        return;
    try {
        if (fs.existsSync(CACHE_FILE)) {
            const content = fs.readFileSync(CACHE_FILE, 'utf-8');
            memoryCache = JSON.parse(content);
        }
    }
    catch (e) {
        // ignore errors
    }
    isLoaded = true;
}
function saveCache() {
    try {
        fs.writeFileSync(CACHE_FILE, JSON.stringify(memoryCache, null, 2));
    }
    catch (e) {
        // ignore
    }
}
export function getCachedDeployments(context, namespace) {
    loadCache();
    const key = `${context}:${namespace}`;
    return memoryCache.deployments[key] || null;
}
export function setCachedDeployments(context, namespace, deployments) {
    loadCache();
    const key = `${context}:${namespace}`;
    memoryCache.deployments[key] = deployments;
    saveCache();
}
//# sourceMappingURL=cache.js.map