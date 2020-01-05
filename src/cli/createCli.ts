import { hasProperty, JSONTypes, omit, pick, reduceKey, requiredDeep } from 'type-plus'
import { parseArgv } from '../argv-parser'
import { MultipleArgumentNotLastEntry, OptionNameNotUnique } from '../cli-command'
import { log } from '../log'
import { DisplayLevel, PlainPresenter } from '../presenter'
import { loadConfig } from './loadConfig'
import { Cli2 } from './types'
import { CommandInstance } from './typesInternal'

export function createCli<
  Config extends Record<string, JSONTypes> | undefined,
  Context extends Partial<Cli2.BuildInContext> & Record<string | symbol, any>,
  N1 extends string,
  N2 extends string,
  N3 extends string,
  N4 extends string,
  >(options: Cli2.ConstructOptions<Config, Context, N1, N2, N3, N4>): Cli2 {
  const context = buildContext(options)
  const opts = buildParseOption(options)
  log.debug('cwd:', context.cwd)

  const ui = context.ui

  const commands = buildCommands(context, opts)
  const cli = {
    name: opts.name,
    version: opts.version,
    parse(argv: string[]) {
      const argvWithoutNode = argv.slice(1)
      const args = parseArgv(opts, argvWithoutNode)
      if (args.version) {
        ui.showVersion(opts.version)
      }
      ui.displayLevel = args.verbose ? DisplayLevel.Verbose :
        args.silent ? DisplayLevel.Silent : DisplayLevel.Normal

      const [command, cmdArgs, cmdArgv] = getCommandExecution(commands, getArgvForCommand(argvWithoutNode))
      if (command) {
        log.debug(`found command: ${command.name}`)
        if (args.help || !hasProperty(command, 'run')) {
          ui.showHelp(command)
          return
        }

        return command.run(cmdArgs, cmdArgv)
      }

      if (args.help) {
        ui.showHelp(opts)
      }

      if (hasProperty(opts, 'run') && (opts.arguments && opts.arguments.length > 0 || args._.length === 0)) {
        const trimmedArgs = removeCliLevelOptions(args)
        return opts.run.call(context, trimmedArgs, argvWithoutNode)
      }

      if (args._.length > 0)
        ui.error(`Unknown command: ${args._.join(' ')}`)

      ui.showHelp(opts)
    }
  }
  return cli
}

function buildContext<
  Config extends Record<string, JSONTypes> | undefined,
  Context,
  N1 extends string,
  N2 extends string,
  N3 extends string,
  N4 extends string
>(options: Cli2.ConstructOptions<Config, Context, N1, N2, N3, N4>): Cli2.RunContext<Config, Context> {
  // as any because `config` is `Config | undefined`
  const context = {
    name: options.name,
    version: options.version,
    config: options.config,
    cwd: process.cwd(),
    ...options.context
  } as any

  if (!context.ui) context.ui = new PlainPresenter()

  if (options.config) {
    const configName = options.configName || options.name
    context.config = requiredDeep(options.config ?? {}, loadConfig(`${configName}.json`, { cwd: context.cwd }))
    log.debug('Loaded config', context.config)
  }

  return context
}

function buildParseOption<
  Config extends Record<string, JSONTypes> | undefined,
  Context,
  N1 extends string,
  N2 extends string,
  N3 extends string,
  N4 extends string
>(options: Cli2.ConstructOptions<Config, Context, N1, N2, N3, N4>): Cli2.ConstructOptions<Config, Context, N1, N2, N3, N4> {
  return requiredDeep({ options: defaultOptions }, options)
}

const defaultOptions = {
  boolean: {
    'help': {
      description: 'Print help message',
      alias: ['h'],
    },
    'version': {
      description: 'Print the CLI version',
      alias: ['v'],
    },
    'verbose': {
      description: 'Turn on verbose logging',
      alias: ['V'],
    },
    'silent': {
      description: 'Turn off logging',
    },
    'debug-cli': {
      description: 'Display clibuilder debug messages',
    },
  },
}

function removeCliLevelOptions(options: Record<string, any>): any {
  const keys = ['version', 'verbose', 'silent', 'debug-cli']
  return reduceKey(options, (p, v) => {
    if (keys.indexOf(v) === -1) p[v] = options[v]
    return p
  }, {} as any)
}

function buildCommands<
  Config extends Record<string, JSONTypes> | undefined,
  Context,
  N1 extends string,
  N2 extends string,
  N3 extends string,
  N4 extends string
>(context: Cli2.RunContext<Config, Context>, options: Cli2.ConstructOptions<Config, Context, N1, N2, N3, N4>): CommandInstance[] {
  if (hasProperty(options, 'commands')) {
    return options.commands.map(cmd => createCliCommand(cmd, context, []))
  }
  return []
}

function createCliCommand<Config, Context>(cmd: Cli2.Command<Config, Context>, parent: Cli2.RunContext<Config, Context>, parentNames: string[]) {
  log.debug('creatingCommand:', [...parentNames, cmd.name].join(' > '))
  validateCliCommand(cmd)

  const context: Cli2.RunContext<Config, Context> = {
    ...parent,
    ...omit(cmd, 'commands')
  }
  const command = {
    ...cmd,
    parent: pick(parent, 'name')
  }

  if (hasProperty(command, 'run')) {
    command.run = command.run.bind(context)
  }

  if (command.commands) {
    const newParentNames = [...parentNames, cmd.name]
    command.commands = command.commands.map(c => createCliCommand(c, context, newParentNames))
  }
  return command as any
}

function validateCliCommand(cmd: Cli2.Command<any, any>) {
  validateArgument(cmd)
  validateOptions(cmd)
}

function validateArgument(cmd: Cli2.Command<any, any>) {
  const args = cmd.arguments
  if (args) {
    const multiIndex = args.findIndex(arg => arg.multiple === true)
    if (multiIndex !== -1 && multiIndex !== args.length - 1) {
      throw new MultipleArgumentNotLastEntry(cmd.name, args[multiIndex].name)
    }
  }
}

function validateOptions(cmd: Cli2.Command<any, any>) {
  const options = cmd.options
  if (options) {
    const strOptionNames = options.string ? Object.keys(options.string) : []
    const numOptionNames = options.number ? Object.keys(options.number) : []
    const boolOptionNames = options.boolean ? Object.keys(options.boolean) : []
    const names: string[] = []
    strOptionNames.forEach(n => {
      if (names.indexOf(n) === -1) names.push(n)
      else throw new OptionNameNotUnique(cmd.name, n)
    })
    numOptionNames.forEach(n => {
      if (names.indexOf(n) === -1) names.push(n)
      else throw new OptionNameNotUnique(cmd.name, n)
    })
    boolOptionNames.forEach(n => {
      if (names.indexOf(n) === -1) names.push(n)
      else throw new OptionNameNotUnique(cmd.name, n)
    })
  }
}

export function getCommandExecution(
  commands: CommandInstance[],
  argv: string[],
): [CommandInstance | undefined, any, string[]] {
  let cmdExecution: [CommandInstance | undefined, any, string[]] = [undefined, undefined, []]
  if (argv.length === 0) return cmdExecution

  const cmdArgv = [...argv]
  const nameOrAlias = cmdArgv[0]
  commands.forEach(cmd => {
    const match = cmd.name === nameOrAlias ||
      (!!cmd.alias && cmd.alias.indexOf(nameOrAlias) !== -1)
    if (!match) return

    cmdExecution = [cmd, parseArgv(cmd, cmdArgv), cmdArgv]
    if (!cmd.commands) return

    const nested = getCommandExecution(cmd.commands, cmdArgv.slice(1))
    if (nested[0]) cmdExecution = nested
  })
  return cmdExecution
}

function getArgvForCommand(argv: string[]) {
  const cmdArgv = argv.slice(1)
  if (cmdArgv.length === 0) return cmdArgv
  if (cmdArgv.every(a => a.startsWith('-'))) return cmdArgv
  while (cmdArgv[0].startsWith('-')) {
    cmdArgv.push(cmdArgv.shift()!)
  }
  return cmdArgv
}
