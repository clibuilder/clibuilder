import chalk from 'chalk'
import { basename } from 'path'
import { findKey, RequiredPick } from 'type-plus'
import type { cli, DisplayLevel } from './cli.js'
import { getBaseCommand } from './commands.js'
import { Context } from './context.js'
import { AppInfo } from './loadAppInfo.js'
import type { Command } from './typesInternal.js'

export namespace state {
  export type Result<C = any> = {
    name: string,
    version?: string,
    description: string,
    configName: string,
    config?: C,
    keyword: string,
    displayLevel: DisplayLevel,
    command: RequiredPick<Command, 'commands'>
  }
}

function fillOption(ctx: Context, options?: cli.Options): Required<cli.Options> {
  if (options && options.name && options.version && options.description !== undefined) {
    return options as any
  }
  const stack = new Error().stack!
  const appPath = ctx.getAppPath(stack)
  const appInfo = ctx.loadAppInfo(appPath)
  if (appInfo) {
    const name = options?.name || getCliName(appPath, appInfo)
    const version = options?.version || appInfo.version || ''
    const description = options?.description || appInfo.description || ''
    const configName = options?.configName || ''
    if (name) {
      ctx.ui.debug(`package name: ${name}`)
      ctx.ui.debug(`version: ${version}`.trim())
      ctx.ui.debug(`description: ${description}`.trim())
      return { name, version, description, configName }
    }
  }
  ctx.ui.error(`Unable to locate a ${chalk.yellow('package.json')} for application:
    ${chalk.cyan(appPath)}

    please specify the name of the application manually.`)
  ctx.process.exit(1)
  return {} as any
}

export function state(ctx: Context, options?: cli.Options): state.Result<any> {
  const opt = fillOption(ctx, options)
  return {
    ...opt,
    keyword: '',
    displayLevel: 'info',
    command: getBaseCommand(opt?.description) as any
  }
}

function getCliName(appPath: string, { name, bin, dir }: AppInfo): string | undefined {
  if (!bin) return name || basename(dir)

  if (typeof bin === 'string') {
    return appPath.endsWith(bin) ? name : undefined
  }
  return findKey(bin, (key) => appPath.endsWith(bin[key]))
}
