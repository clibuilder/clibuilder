import chalk from 'chalk'
import { basename } from 'path'
import { findKey } from 'type-plus'
import { cli } from './cli'
import { AppContext } from './createAppContext'
import { AppInfo } from './loadAppInfo'

export type AppState<C = any> = {
  name: string,
  version?: string,
  description?: string,
  configFilePath?: string,
  config?: C,
  commands: cli.Command[],
  debugLogs: any[][]
}

export function createAppState(
  { ui, getAppPath, loadAppInfo, process }: AppContext,
  options?: cli.Options): AppState<any> {
  const debugLogs: any[][] = []
  if (options) return {
    ...options,
    debugLogs,
    commands: []
  }
  const stack = new Error().stack!
  const appPath = getAppPath(stack)
  const appInfo = loadAppInfo(debugLogs, appPath)
  if (appInfo) {
    const name = getCliName(appPath, appInfo)
    if (name) {
      debugLogs.push([`package name: ${name}`])
      debugLogs.push([`version: ${appInfo.version}`])
      debugLogs.push([`description: ${appInfo.description}`])
      return {
        name,
        version: appInfo.version,
        description: appInfo.description,
        debugLogs,
        commands: []
      }
    }
  }

  ui.error(`Unable to locate a ${chalk.yellow('package.json')} for application:
    ${chalk.cyan(appPath)}

    please specify the name of the application manually.`)
  process.exit(1)
  return {} as any
}

function getCliName(appPath: string, { name, bin, dir }: AppInfo): string | undefined {
  if (!bin) return name || basename(dir)

  if (typeof bin === 'string') {
    return appPath.endsWith(bin) ? name : undefined
  }
  return findKey(bin, (key) => appPath.endsWith(bin[key]))
}
