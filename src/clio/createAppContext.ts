import { existsSync, readFileSync } from 'fs'
import path from 'path'
import { getAppPath } from '../getAppPath'
import { loadAppInfo } from './loadAppInfo'
import { ui } from '../ui'

/**
 * Creates an app context that provides interactions to external system
 * This
 */
export function createAppContext() {
  return {
    getAppPath,
    loadAppInfo,
    loadConfig,
    ui: ui(),
    process
  }
}

export type AppContext = ReturnType<typeof createAppContext>

function loadConfig(cwd: string, configFileName: string): { configFilePath?: string, config?: unknown } {
  const configFilePath = resolveConfigFilename(cwd, configFileName)
  if (!configFilePath) return {}
  return {
    configFilePath,
    config: JSON.parse(readFileSync(configFilePath, 'utf8'))
  }
}

function resolveConfigFilename(cwd: string, configFileName: string) {
  if (configFileName.indexOf('.') >= 0) {
    return path.join(cwd, configFileName)
  }

  const filepaths = [
    path.join(cwd, `${configFileName}.json`),
    path.join(cwd, `.${configFileName}rc.json`),
    path.join(cwd, `.${configFileName}rc`),
  ]
  for (const filepath of filepaths) {
    if (existsSync(filepath)) return filepath
  }
  return undefined
}
