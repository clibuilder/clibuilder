import { forEachKey, RequiredPick } from 'type-plus'
import { ZodTypeAny } from 'zod'
import type { cli } from './cli.js'
import { getBaseCommand, pluginsCommand } from './commands.js'
import { Context } from './context.js'
import { lookupCommand } from './lookupCommand.js'
import { parseArgv } from './parseArgv.js'
import { state } from './state.js'
import { Command } from './typesInternal.js'

export function builder(context: Context, options: RequiredPick<cli.Options, 'config'> | RequiredPick<cli.Options, 'keywords'>): cli.Builder & cli.Executable
export function builder(context: Context, options: cli.Options): cli.Builder
export function builder(context: Context, options: cli.Options): cli.Builder & cli.Executable {
  // set `clibuilder-debug` logs manually to logLevels.all,
  // as user can run `config()` to set the log levels
  // and override the log level for this logger.
  // context.ui.displayLevel = 'trace'
  const s = state(options)
  const pending: Promise<any>[] = []
  const configName = s.configName ? (typeof s.configName === 'string' ? s.configName : s.name) : undefined
  const loadingConfig = configName ? context.loadConfig(configName) : undefined

  if (s.keywords)
    s.command.commands.push(adjustCommand(s.command, pluginsCommand))

  if (loadingConfig) {
    pending.push(
      loadingConfig.then(config => {
        s.config = config
        if (config?.plugins) {
          return context
            .loadPlugins(config.plugins)
            .then(commands => s.command.commands.push(...commands.map(c => adjustCommand(s.command, c))))
        }
      }))
  }
  return {
    name: s.name,
    version: s.version,
    description: s.description,
    parse: ((s.configName || s.keywords.length > 0) ? parse : undefined) as any,
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
      const configName = typeof s.configName === 'string' ? s.configName : s.name
      const { config, errors } = parseConfig(command.config, await context.loadConfig(configName))
      s.config = config
      if (errors) {
        context.ui.error(`config fails validation:`)
        forEachKey(errors, k => context.ui.error(`  ${String(k)}: ${errors[k]}`))
        createCommandInstance(context, s, r.command).ui.showHelp()
        return
      }
    }
    const commandInstance = createCommandInstance(context, s, command)
    if (args.help) return commandInstance.ui.showHelp()
    return commandInstance.run(args as any)
  }

  function parseConfig(configType: ZodTypeAny, config: any) {
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
    keywords: state.keywords,
    cwd: ctx.cwd
  }
}

function createCommandUI(ctx: Context, state: state.Result, command: cli.Command) {
  const ui = ctx.createUI(command.name || state.name)
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
