import chalk from 'chalk'
import { basename } from 'path'
import { findKey, T } from 'type-plus'
import { AppContext } from './createAppContext'
import { AppInfo } from './loadAppInfo'
import { cli } from './types'
import { AppState } from './typesInternal'

export function clibuilder(context: AppContext, options?: cli.Options): cli.Builder<any> {
  const state = createAppState(context, options)
  return {
    name: state.name,
    version: state.version || '',
    description: state.description || '',
    config: undefined,
    loadConfig(options) {
      const { config, configFilePath } = context.loadConfig(
        context.process.cwd(),
        options?.name || state.name
      )
      if (config) {
        if (T.satisfy(options.type, config)) {
          state.configFilePath = configFilePath;
          (this as any).config = config
        }
        else {
          context.ui.error(T.satisfy.getReport())
          context.process.exit(1)
        }
      }
      return this as any
    },
    loadPlugins() { return {} as any },
    default(command) { return {} as any },
    addCommands(commands) { return {} as any },
    parse(argv?: string[]): Promise<void> { return {} as any }
  }
}

function createAppState(
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
