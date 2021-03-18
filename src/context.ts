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
  const logEntries: LogEntry[] = []
  const logger = getLogger('clibuilder')
  // istanbul ignore next
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
      logEntries.push(...logs)
    },
    info(...args: any[]) {
      const [, logs] = captureLogs(logger, () => logger.info(...args))
      logEntries.push(...logs)
    },
    warn(...args: any[]) {
      const [, logs] = captureLogs(logger, () => logger.warn(...args))
      logEntries.push(...logs)
    },
    error(...args: any[]) {
      const [, logs] = captureLogs(logger, () => logger.error(...args))
      logEntries.push(...logs)
    },
  }
  return {
    getAppPath,
    loadAppInfo(appPkgPath: string) {
      return loadAppInfo(log, appPkgPath)
    },
    loadConfig(configFileName: string) {
      const cwd = this.process.cwd()
      // istanbul ignore next
      const win = this.process.platform === 'win32'
      // istanbul ignore next
      const home = (win ? this.process.env.USERPROFILE : this.process.env.HOME) as string
      const configFilePath = resolveConfigFilename(cwd, home, configFileName)
      if (configFilePath) {
        const cfg = readFileSync(configFilePath, 'utf8')
        this.log.debug(`load config from: ${configFilePath}`)
        this.log.debug(`config: ${cfg}`)
        return JSON.parse(cfg)
      }
      else {
        this.log.warn(`no config found for ${configFileName}`)
      }
    },
    async loadPlugins(keyword: string) {
      const cwd = this.process.cwd()
      return loadPlugins({ cwd, log }, keyword)
    },
    log,
    logEntries,
    ui,
    process
  }
}

export type Context = ReturnType<typeof context>

function resolveConfigFilename(cwd: string, home: string, configFileName: string) {
  if (configFileName.startsWith('.')) {
    return resolveConfigFilenames(cwd, home, [
      configFileName,
      `${configFileName}.json`,
      `${configFileName}rc.json`,
      `${configFileName}rc`
    ])
  }
  if (configFileName.indexOf('.') >= 0) {
    return resolveConfigFilenames(cwd, home, [
      configFileName
    ])
  }

  return resolveConfigFilenames(cwd, home, [
    `${configFileName}.json`,
    `.${configFileName}rc.json`,
    `.${configFileName}rc`
  ])
}

function resolveConfigFilenames(cwd: string, home: string, filenames: string[]) {
  for (const filename of filenames) {
    let filePath = findUp.sync(filename, { cwd })
    if (filePath) return filePath

    filePath = path.join(home, filename)
    // istanbul ignore next
    if (existsSync(filePath)) return filePath
  }
}
