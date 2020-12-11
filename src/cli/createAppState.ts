import chalk from 'chalk'
import { basename } from 'path'
import { findKey } from 'type-plus'
import { AppContext } from './createAppContext'
import { AppInfo } from './loadAppInfo'
import { cli } from './types'

export type AppState<C> = {
  name: string,
  version?: string,
  description?: string,
  configFilePath?: string,
  config?: C,
}

export function createAppState(
  { ui, getAppPath, loadAppInfo, process }: AppContext,
  options?: cli.Options): AppState<any> {
  if (options) return options
  const stack = new Error().stack!
  const appPath = getAppPath(stack)
  const appInfo = loadAppInfo(appPath)
  const name = getCliName(appPath, appInfo)
  if (!name) {
    ui.error(`Unable to locate a ${chalk.yellow('package.json')} for application:
    ${chalk.cyan(appPath)}

    please specify the name of the application manually.`)
    process.exit(1)
  }
  return {
    name: name!,
    version: appInfo.version,
    description: appInfo.description
  }
}

function getCliName(appPath: string, { name, bin, dir }: AppInfo): string | undefined {
  if (!bin) return name || basename(dir)

  if (typeof bin === 'string') {
    return appPath.endsWith(bin) ? name : undefined
  }
  return findKey(bin, (key) => appPath.endsWith(bin[key]))
}
