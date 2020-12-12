import { T } from 'type-plus'
import { AppContext } from './createAppContext'
import { AppState, createAppState } from './createAppState'
import { getBottomCommand } from './getBottomCommand'
import { processArgv } from './processArgv'
import { cli } from './types'

export function clibuilder(context: AppContext, options?: cli.Options): cli.Builder<any> {
  const state = createAppState(context, options)
  const commands: cli.Command[] = []
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
          state.configFilePath = configFilePath
          state.config = (this as any).config = config
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
      commands.unshift({ ...command, name: '' })
      return this
    },
    addCommands(commands) {
      commands.push(...commands)
      return this
    },
    parse(argv: string[]): Promise<any> {
      commands.push(getBottomCommand(this))
      const { command, args } = processArgv(commands, argv)

      if (args.silent) context.ui.displayLevel = 'none'

      const commandInstance = createCommandInstance(context, state, command)

      return Promise.resolve(commandInstance.run(args))
    }
  }
}

function createCommandInstance({ ui }: AppContext, state: AppState, command: cli.Command) {
  return {
    ...command,
    ui: createCommandUI(ui, state, command),
    config: state.config,
  }
}

function createCommandUI(ui: AppContext['ui'], state: AppState, command: cli.Command) {
  return {
    ...ui,
    showVersion: () => ui.showVersion(state.version),
    showHelp: () => ui.showHelp(command)
  }
}
