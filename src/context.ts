import { existsSync, readFileSync } from 'fs'
import path from 'path'
import { captureLogs, getLogger, LogEntry } from 'standard-log'
import { getAppPath } from './getAppPath'
import { loadAppInfo } from './loadAppInfo'
import { loadPlugins } from './loadPlugins'
import { ui } from './ui'

/**
 * Creates an app context that provides interactions to external system
 * This
 */
export function context() {
  const debugLogs: LogEntry[] = []
  const logger = getLogger('clibuilder')
  const log = {
    ...logger,
    get level(): number | undefined {
      return logger.level
    },
    set level(value: number | undefined) {
      logger.level = value
    },
    debug(...args: any[]) {
      const [, logs] = captureLogs(logger, () => logger.debug(...args))
      debugLogs.push(...logs)
    },
    info(...args: any[]) {
      const [, logs] = captureLogs(logger, () => logger.info(...args))
      debugLogs.push(...logs)
    },
    warn(...args: any[]) {
      const [, logs] = captureLogs(logger, () => logger.warn(...args))
      debugLogs.push(...logs)
    },
    error(...args: any[]) {
      const [, logs] = captureLogs(logger, () => logger.error(...args))
      debugLogs.push(...logs)
    },
  }
  return {
    getAppPath,
    loadAppInfo(appPkgPath: string) {
      return loadAppInfo(log, appPkgPath)
    },
    loadConfig(configFileName: string) {
      const cwd = this.process.cwd()
      return loadConfig(cwd, configFileName)
    },
    async loadPlugins(keyword: string) {
      const cwd = this.process.cwd()
      return loadPlugins({ cwd, log: logger }, keyword)
    },
    log,
    debugLogs,
    ui: ui(),
    process
  }
}

export type Context = ReturnType<typeof context>

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
