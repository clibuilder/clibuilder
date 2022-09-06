import { findUpSync } from 'find-up'
import { existsSync, readFileSync } from 'fs'
import path from 'path'
import { createStandardLog, logLevels } from 'standard-log'
import { getAppPath } from './getAppPath.js'
import { loadAppInfo } from './loadAppInfo.js'
import { loadPlugins } from './loadPlugins.js'
import { createBuilderUI, createUI } from './ui.js'

/**
 * Creates an app context that provides interactions to external system
 * This
 */
export function context() {
  const sl = createStandardLog({ logLevel: logLevels.all })
  const ui = createBuilderUI(createUI(sl.getLogger('clibuilder')))
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
      const configFileNames = getConfigFilenames(configFileName)
      const configFilePath = resolveConfigFilenames(cwd, home, configFileNames)
      if (configFilePath) {
        const cfg = readFileSync(configFilePath, 'utf8')
        this.ui.debug(`load config from: ${configFilePath}`)
        this.ui.debug(`config: ${cfg}`)
        return JSON.parse(cfg)
      }
      else {
        this.ui.warn(`no config found:\n  ${configFileNames.join('\n  ')}`)
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

function getConfigFilenames(configFileName: string) {
  if (configFileName.startsWith('.')) {
    return [
      configFileName,
      `${configFileName}.json`,
      `${configFileName}rc.json`,
      `${configFileName}rc`
    ]
  }
  if (configFileName.indexOf('.') >= 0) {
    return [configFileName]
  }

  return [
    `${configFileName}.json`,
    `.${configFileName}rc.json`,
    `.${configFileName}rc`
  ]
}

function resolveConfigFilenames(cwd: string, home: string, filenames: string[]) {
  for (const filename of filenames) {
    let filePath = findUpSync(filename, { cwd })
    if (filePath) return filePath

    filePath = path.join(home, filename)
    // istanbul ignore next
    if (existsSync(filePath)) return filePath
  }
}
