import { getLogger } from 'standard-log'
import { forEachKey } from 'type-plus'
import { ZodTypeAny } from 'zod'
import type { cli } from './cli'
import { getBaseCommand, pluginsCommand } from './commands'
import { Context } from './context'
import { lookupCommand } from './lookupCommand'
import { parseArgv } from './parseArgv'
import { state } from './state'
import { Command } from './typesInternal'

export function builder(context: Context, options?: cli.Options): cli.Builder {
  // set `clibuilder-debug` logs manually to logLevels.all,
  // as user can run `config()` to set the log levels
  // and override the log level for this logger.
  // context.ui.displayLevel = 'trace'
  const s = state(context, options)
  const description = s.description
  const pending: Promise<any>[] = []
  return {
    name: s.name,
    version: s.version || '',
    description,
    loadPlugins(keyword?: string) {
      s.keyword = keyword || `${s.name}-plugin`
      s.command.commands.push(adjustCommand(s.command, pluginsCommand))
      pending.push(context
        .loadPlugins(s.keyword)
        .then(commands => s.command.commands.push(...commands.map(c => adjustCommand(s.command, c)))))
      return { ...this, parse }
    },
    default(command) {
      s.command = adjustCommand(s.command, { ...s.command, ...command })
      return { ...this, parse }
    },
    command(command) {
      s.command.commands.push(adjustCommand(s.command, command))
      return { ...this, parse }
    }
  }

  async function parse(argv: string[]) {
    await Promise.all(pending)
    context.ui.debug('argv:', argv.join(' '))
    const rawArgs = parseArgv(argv)
    const { args: baseArgs } = lookupCommand(getBaseCommand(s.description), rawArgs)
    if (baseArgs.silent) {
      delete rawArgs.silent
      s.displayLevel = 'none'
    }
    if (baseArgs.verbose) {
      delete rawArgs.verbose
      s.displayLevel = 'debug'
    }
    if (baseArgs['debug-cli']) {
      delete rawArgs['debug-cli']
      s.displayLevel = 'trace'
    }
    context.ui.displayLevel = s.displayLevel
    context.ui.dump()

    const r = lookupCommand(s.command, rawArgs)
    const { args, command } = r

    if (args.version) return createCommandInstance(context, s, r.command).ui.showVersion()
    if (r.errors.length > 0) return createCommandInstance(context, s, r.command).ui.showHelp()

    if (command.config) {
      const { config, errors } = loadConfig(context, s.configName || s.name, command.config)
      if (errors) {
        context.ui.error(`config fails validation:`)
        forEachKey(errors, k => context.ui.error(`  ${String(k)}: ${errors[k]}`))
        createCommandInstance(context, s, r.command).ui.showHelp()
        return
      }
      s.config = config
    }
    const commandInstance = createCommandInstance(context, s, command)
    if (args.help) return commandInstance.ui.showHelp()
    return commandInstance.run(args as any)
  }

  function loadConfig(context: Context, configName: string, configType: ZodTypeAny) {
    const config = context.loadConfig(configName)
    const r = configType.safeParse(config)
    if (r.success) {
      return { config }
    }
    else {
      const errors = r.error.flatten().fieldErrors
      return { errors }
    }
  }
}

function createCommandInstance(ctx: Context, state: state.Result, command: cli.Command) {
  return {
    ...command,
    run: (command as any).run,
    ui: createCommandUI(ctx, state, command),
    config: state.config,
    keyword: state.keyword,
    cwd: ctx.process.cwd()
  }
}

function createCommandUI(ctx: Context, state: state.Result, command: cli.Command) {
  const ui = ctx.createUI(getLogger(command.name || state.name))
  ui.displayLevel = state.displayLevel
  // istanbul ignore next
  return {
    ...ui,
    showVersion: () => ui.showVersion(state.version),
    showHelp: () => ui.showHelp(state.name, command)
  }
}

function adjustCommand<C extends Command>(base: Command, command: C): C {
  if (command.name) {
    command.parent = base
  }
  if (command.commands) {
    command.commands = command.commands.map(c => adjustCommand(command, c))
  }
  return command
}
