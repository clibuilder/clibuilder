import findUp from 'find-up'
import { existsSync, readFileSync } from 'fs'
import path from 'path'
import { getLogger, logLevels } from 'standard-log'
import { getAppPath } from './getAppPath'
import { loadAppInfo } from './loadAppInfo'
import { loadPlugins } from './loadPlugins'
import { createBuilderUI, createUI } from './ui'

/**
 * Creates an app context that provides interactions to external system
 * This
 */
export function context() {
  const ui = createBuilderUI(createUI(getLogger('clibuilder', { level: logLevels.all })))
  return {
    getAppPath,
    loadAppInfo(appPkgPath: string) {
      return loadAppInfo(this.ui, appPkgPath)
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
        this.ui.debug(`load config from: ${configFilePath}`)
        this.ui.debug(`config: ${cfg}`)
        return JSON.parse(cfg)
      }
      else {
        this.ui.warn(`no config found for ${configFileName}`)
      }
    },
    async loadPlugins(keyword: string) {
      const cwd = this.process.cwd()
      return loadPlugins({ cwd, ui: this.ui }, keyword)
    },
    // log,
    process,
    // cliReporter,
    createUI,
    ui
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
