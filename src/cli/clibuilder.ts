import { requiredDeep, T } from 'type-plus'
import type { cli } from './cli'
import { AppContext } from './createAppContext'
import { AppState, createAppState } from './createAppState'
import { getBottomCommand } from './getBottomCommand'
import { processArgv } from './processArgv'

export function clibuilder(context: AppContext, options?: cli.Options): cli.Builder<any> {
  const state = createAppState(context, options)
  const commands: cli.Command[] = [getBottomCommand(state)]
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
    loadPlugins() {
      (this as any).parse = parse
      return this as any
    },
    default(command) {
      const cmd = commands[0]
      commands[0] = {
        ...cmd,
        ...command,
        options: requiredDeep(cmd.options!, command.options)
      };
      (this as any).parse = parse
      return this as any
    },
    addCommands(commands) {
      commands.push(...commands);
      (this as any).parse = parse
      return this as any
    }
  }

  function parse(this: cli.Builder<any>, argv: string[]): Promise<any> {
    const { command, args } = processArgv(commands, argv)

    if (args.silent) context.ui.displayLevel = 'none'
    if (args.verbose) context.ui.displayLevel = 'debug'

    const commandInstance = createCommandInstance(context, state, command)

    if (args.version) {
      commandInstance.ui.showVersion()
      return Promise.resolve()
    }
    if (args.help) {
      commandInstance.ui.showHelp()
      return Promise.resolve()
    }
    return Promise.resolve(commandInstance.run(args))
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
    showHelp: () => ui.showHelp(state.name, command)
  }
}
