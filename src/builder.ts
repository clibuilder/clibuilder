import { logLevels, toLogLevelName } from 'standard-log'
import { forEachKey } from 'type-plus'
import { ZodTypeAny } from 'zod'
import type { cli } from './cli'
import { getBaseCommand } from './command'
import { Context } from './context'
import { lookupCommand } from './lookupCommand'
import { parseArgv } from './parseArgv'
import { state } from './state'
import { Command } from './types'

export function builder(context: Context, options?: cli.Options): cli.Builder {
  // set `clibuilder-debug` logs manually to logLevels.all,
  // as user can run `config()` to set the log levels
  // and override the log level for this logger.
  context.log.level = logLevels.all
  const s = state(context, options)
  const description = s.description || ''
  const baseCommand = getBaseCommand(description)
  s.commands = [baseCommand]
  const pending: Promise<any>[] = []
  return {
    name: s.name,
    version: s.version || '',
    description,
    loadPlugins(keyword?: string) {
      const search = keyword || `${s.name}-plugin`
      pending.push(context
        .loadPlugins(search)
        .then(commands => s.commands.push(...commands)))
      return { ...this, parse }
    },
    default(command) {
      s.commands[0] = adjustCommand(baseCommand, { ...baseCommand, ...command })
      return { ...this, parse }
    },
    command(command) {
      s.commands.push(adjustCommand(baseCommand, command))
      return { ...this, parse }
    }
  }

  async function parse(argv: string[]) {
    await Promise.all(pending)
    context.log.debug('argv:', argv.join(' '))
    const r = lookupCommand(s.commands, parseArgv(argv))
    if (!r || r.errors.length > 0) {
      // TODO: print errors
      createCommandInstance(context, s, r?.command || s.commands[0]).ui.showHelp()
      return
    }
    const { args, command } = r
    if (args.silent) context.ui.displayLevel = 'none'
    if (args.verbose) context.ui.displayLevel = 'debug'
    if (args['debug-cli']) {
      context.ui.displayLevel = 'trace'
      context.debugLogs.map(entry => (context.ui as any)[toLogLevelName(entry.level)](...entry.args))
    }
    if (args.version) {
      context.ui.showVersion(s.version)
      return
    }

    if (command.config) {
      loadConfig(command.config)
    }
    const commandInstance = createCommandInstance(context, s, command)
    if (args.help) {
      commandInstance.ui.showHelp()
      return
    }
    return commandInstance.run(args as any)
  }

  function loadConfig(configType: ZodTypeAny) {
    const { config, configFilePath } = context.loadConfig(s.configName || s.name)
    if (configFilePath) {
      context.log.debug(`load config from: ${configFilePath}`)
      context.log.debug(`config: ${JSON.stringify(config)}`)
    }
    else {
      context.log.debug(`unable to load config from ${configFilePath}`)
    }
    const r = configType.safeParse(config)
    if (r.success) {
      s.config = config
    }
    else {
      const errors = r.error.flatten().fieldErrors
      context.ui.error(`config fails validation:`)
      forEachKey(errors, k => context.ui.error(`  ${k}: ${errors[k]}`))
    }
  }
}

function createCommandInstance({ ui }: Context, state: state.Result, command: cli.Command) {
  const run = (command as any).run ? (command as any).run : function (this: any) { this.ui.showHelp }
  return {
    ...command,
    run,
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

function adjustCommand(base: Command, command: Command): Command {
  if (command.name) {
    command.parent = base
  }
  if (command.commands) {
    command.commands = command.commands.map(c => adjustCommand(command, c))
  }
  return command
}
