import { T } from 'type-plus'
import { parseArgv } from '../argv-parser'
import { AppContext } from './createAppContext'
import { createAppState } from './createAppState'
import { defaultCommandOptions } from './defaultCommandOptions'
import { removeClibuilderOptions } from './removeClibuilderOptions'
import { cli } from './types'

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
    loadPlugins() { return this as any },
    default(command) {
      state.commands.unshift({ ...command, name: '' })
      return this
    },
    addCommands(commands) {
      state.commands.push(...commands)
      return this
    },
    parse(argv: string[]): Promise<void> {
      const argvWithoutNode = argv.slice(1)
      const { ui } = context
      const command = {
        name: state.name,
        options: defaultCommandOptions
      }

      let args
      try {
        args = parseArgv(command, argvWithoutNode)
      }
      catch (e) {
        ui.error(e.message)
        ui.showHelp(command)
        throw e
      }
      const [trimmedArgs, trimmedArgv] = removeClibuilderOptions(args, argvWithoutNode)

      if (args.version) {
        ui.showVersion(state.version)
        return Promise.resolve()
      }

      return Promise.resolve()
    }
  }
}
