import type { cli } from './cli'
import { getBaseCommand } from './command'
import { Context } from './context'
import { lookupCommand } from './lookupCommand'
import { parseArgv } from './parseArgv'
import { state } from './state'

export function builder(context: Context, options?: cli.Options): cli.Builder<any> {
  const s = state(context, options)
  const description = s.description || ''
  s.commands = [getBaseCommand(description) as any]
  return {
    name: s.name,
    version: s.version || '',
    description,
    loadPlugins() {
      return { ...this, parse }
    },
    loadConfig(configType) {
      return { ...this, config: configType } as any
    },
    default(command) {
      s.commands[0] = {
        ...s.commands[0], ...command,
        options: { ...s.commands[0].options, ...command.options }
      }
      return { ...this, parse }
    },
    addCommands(commands) {
      s.commands.push(...commands)
      return { ...this, parse }
    }
  }

  function parse(argv: string[]): Promise<any> {
    s.debugLogs.push(['argv:', argv.join(' ')])
    const r = lookupCommand(s.commands, parseArgv(argv))
    if (!r || r.errors.length > 0) {
      createCommandInstance(context, s, s.commands[0]).ui.showHelp()
      return Promise.resolve()
    }
    const { args, command } = r
    if (args.silent) context.ui.displayLevel = 'none'
    if (args.verbose) context.ui.displayLevel = 'debug'
    if (args['debug-cli']) {
      context.ui.displayLevel = 'trace'
      s.debugLogs.map(logEntries => context.ui.trace(...logEntries))
    }
    if (args.version) {
      context.ui.showVersion(s.version)
      return Promise.resolve()
    }

    const commandInstance = createCommandInstance(context, s, command)
    if (args.help) {
      commandInstance.ui.showHelp()
      return Promise.resolve()
    }
    return Promise.resolve(commandInstance.run(args as any))
  }
}

function createCommandInstance({ ui }: Context, state: state.Result, command: cli.Command) {
  return {
    ...command,
    ui: createCommandUI(ui, state, command),
    config: state.config,
  }
}

function createCommandUI(ui: Context['ui'], state: state.Result, command: cli.Command) {
  return {
    ...ui,
    showVersion: () => ui.showVersion(state.version),
    showHelp: () => ui.showHelp(state.name, command)
  }
}
