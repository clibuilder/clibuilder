// import { T } from 'type-plus'
import { cli } from './cli'
import { getBottomCommand } from './getBottomCommand'
import { processArgv } from './processArgv'
import { AppContext } from './createAppContext'
import { AppState, createAppState } from './createAppState'

export function clibuilder(context: AppContext, options?: cli.Options) {
  const state = createAppState(context, options)
  const description = state.description || ''
  const commands: cli.Command[] = [getBottomCommand(description)]
  return {
    name: state.name,
    version: state.version || '',
    description,
    default(command: cli.DefaultCommand) {
      commands.unshift({ ...command, name: '' })
      return { ...this, parse }
    }
  }

  function parse(argv: string[]): Promise<any> {
    state.debugLogs.push(['argv:', argv.join(' ')])
    const { command, args } = processArgv(commands, argv)
    if (args.silent) context.ui.displayLevel = 'none'
    if (args.verbose) context.ui.displayLevel = 'debug'
    if (args.debugCli) {
      context.ui.displayLevel = 'trace'
      state.debugLogs.map(logEntries => context.ui.trace(...logEntries))
    }

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
    } as cli.UI
  }
}

// export function clibuilder(context: AppContext, options?: cli.Options): cli.Builder<any> {
//   const state = createAppState(context, options)
//   const commands: cli.Command[] = [getBottomCommand(state)]
//   return {
//     name: state.name,
//     version: state.version || '',
//     description: state.description || '',
//     config: undefined,
//     loadConfig(options) {
//       const { config, configFilePath } = context.loadConfig(
//         context.process.cwd(),
//         options?.name || state.name
//       )
//       if (config) {
//         if (T.satisfy(options.type, config)) {
//           state.configFilePath = configFilePath
//           state.config = (this as any).config = config
//           state.debugLogs.push([`config file path: ${configFilePath}`])
//           state.debugLogs.push([`config:`, config])
//         }
//         else {
//           state.debugLogs.map(logEntries => context.ui.trace(...logEntries))
//           context.ui.error(T.satisfy.getReport())
//           context.process.exit(1)
//         }
//       }
//       return this as any
//     },
//     loadPlugins() {
//       (this as any).parse = parse
//       return this as any
//     },
//     default(command) {
//       commands.unshift({ ...command, name: '' })
//       return this as any
//     },
//     addCommands(commands) {
//       commands.push(...commands)
//       return this
//     },
//   }

