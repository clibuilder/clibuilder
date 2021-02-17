import type { cli } from './cli'
import { Context } from './context'
import { getBaseCommand } from './getBaseCommand'
import { lookupCommand } from './lookupCommand'
import { parseArgv } from './parseArgv'
import { state } from './state'

export function builder(context: Context, options?: cli.Options): cli.Builder<any> {
  const s = state(context, options)
  const description = s.description || ''
  return {
    name: s.name,
    version: s.version || '',
    description,
    loadPlugins() {
      return { ...this, parse }
    },
    loadConfig() {
      return { ...this, config: {} }
    },
    default(command) {
      s.commands.push({ ...command, name: '' })
      return { ...this, parse }
    },
    addCommands(commands) {
      s.commands.push(...commands)
      return { ...this, parse }
    }
  }

  function parse(argv: string[]): Promise<any> {
    s.debugLogs.push(['argv:', argv.join(' ')])
    const args = parseArgv(argv)
    if (args.silent) context.ui.displayLevel = 'none'
    if (args.verbose) context.ui.displayLevel = 'debug'
    if (args.debugCli) {
      context.ui.displayLevel = 'trace'
      s.debugLogs.map(logEntries => context.ui.trace(...logEntries))
    }
    if (args.version) {
      context.ui.showVersion()
      return Promise.resolve()
    }

    const r = lookupCommand(s.commands, args)
    if (!r) {
      createCommandInstance(context, s, getBaseCommand(description)).ui.showHelp()
      return Promise.resolve()
    }

    const commandInstance = createCommandInstance(context, s, r ? r.command : getBaseCommand(description))
    if (r.args.help) {
      commandInstance.ui.showHelp()
      return Promise.resolve()
    }
    return Promise.resolve(commandInstance.run(r.args as any))
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
