import chalk from 'chalk'
import { basename } from 'path'
import { findKey, RequiredPick } from 'type-plus'
import type { cli } from './cli'
import { getBaseCommand } from './commands'
import { Context } from './context'
import { AppInfo } from './loadAppInfo'
import type { Command } from './typesInternal'

export namespace state {
  export type Result<C = any> = {
    name: string,
    version?: string,
    description: string,
    configName: string,
    config?: C,
    keyword: string,
    command: RequiredPick<Command, 'commands'>
  }
}

export function state(
  { ui, getAppPath, loadAppInfo, process, log }: Context,
  options?: cli.Options): state.Result<any> {
  if (options && options.name && options.version && options.description !== undefined) return {
    ...options,
    command: getBaseCommand(options.description)
  } as any
  const stack = new Error().stack!
  const appPath = getAppPath(stack)
  const appInfo = loadAppInfo(appPath)
  if (appInfo) {
    const name = options?.name || getCliName(appPath, appInfo)
    const version = options?.version || appInfo.version
    const description = options?.description || appInfo.description || ''
    if (name) {
      log.debug(`package name: ${name}`)
      log.debug(`version: ${version}`.trim())
      log.debug(`description: ${description}`.trim())
      return {
        name,
        version,
        description,
        configName: options?.configName || '',
        keyword: '',
        command: getBaseCommand(description) as any
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
