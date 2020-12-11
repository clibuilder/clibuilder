import { existsSync, readFileSync } from 'fs'
import path from 'path'
import { getAppPath } from './getAppPath'
import { loadAppInfo } from './loadAppInfo'
import { createUI } from './ui/createUI'

/**
 * Creates an app context that provides interactions to external system
 * This
 */
export function createAppContext() {
  return {
    getAppPath,
    loadAppInfo,
    loadConfig,
    ui: createUI(),
    process
  }
}

export type AppContext = ReturnType<typeof createAppContext>

function loadConfig(cwd: string, configFileName: string) {
  const filepath = resolveConfigFilename(cwd, configFileName)
  if (!filepath) return undefined
  return {
    filepath,
    config: JSON.parse(readFileSync(filepath, 'utf8'))
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
