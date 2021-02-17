import chalk from 'chalk'
import { basename } from 'path'
import { findKey } from 'type-plus'
import type { cli } from './cli'
import { Context } from './context'
import { AppInfo } from './loadAppInfo'

export namespace state {
  export type Result<C = any> = {
    name: string,
    version?: string,
    description?: string,
    configFilePath?: string,
    config?: C,
    commands: cli.Command[],
    debugLogs: any[][]
  }
}

export function state(
  { ui, getAppPath, loadAppInfo, process }: Context,
  options?: cli.Options): state.Result<any> {
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
