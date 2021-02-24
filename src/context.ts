import findUp from 'find-up'
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
      const win = this.process.platform === 'win32'
      const home = win ? process.env.USERPROFILE : process.env.HOME
      return loadConfig(cwd, home, configFileName)
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

function loadConfig(cwd: string, home: string | undefined, configFileName: string): { configFilePath?: string, config?: unknown } {
  const configFilePath = resolveConfigFilename(cwd, home, configFileName)
  if (!configFilePath) return {}
  return {
    configFilePath,
    config: JSON.parse(readFileSync(configFilePath, 'utf8'))
  }
}

function resolveConfigFilename(cwd: string, home: string | undefined, configFileName: string) {
  if (configFileName.indexOf('.') >= 0) {
    return path.join(cwd, configFileName)
  }

  const filenames = [
    path.join(`${configFileName}.json`),
    path.join(`.${configFileName}rc.json`),
    path.join(`.${configFileName}rc`),
  ]
  for (const filename of filenames) {
    let filePath = findUp.sync(filename, { cwd })
    if (filePath) return filePath

    if (home) {
      filePath = path.join(home, filename)
      if (existsSync(filePath)) return filePath
    }
  }
  return undefined
}
