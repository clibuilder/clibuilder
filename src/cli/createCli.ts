import { hasProperty, JSONTypes, omit, pick, reduceKey, requiredDeep } from 'type-plus'
import { parseArgv } from '../argv-parser'
import { MultipleArgumentNotLastEntry, OptionNameNotUnique } from '../errors'
import { log } from '../log'
import { DisplayLevel, PlainPresenter } from '../presenter'
import { loadConfig } from './loadConfig'
import { Cli } from './types'
import { CommandInstance } from './typesInternal'

export function createCli<
  Config extends Record<string, JSONTypes> | undefined,
  Context extends Partial<Cli.BuildInContext> & Record<string | symbol, any>,
  AName extends string,
  BName extends string,
  SName extends string,
  NName extends string,
  >(options: Cli.ConstructOptions<Config, Context, AName, BName, SName, NName>): Cli {
  const context = buildContext(options)
  const opts = buildParseOption(options)
  log.debug('cwd:', context.cwd)

  const ui = context.ui

  const commands = buildCommands(context, opts)
  const cli = {
    name: opts.name,
    version: opts.version,
    async parse(argv: string[]) {
      const argvWithoutNode = argv.slice(1)
      const args = parseArgv(opts, argvWithoutNode)

      const [trimmedArgs, trimmedArgv] = removeCliLevelOptions(args, argvWithoutNode)

      if (args.version) {
        ui.showVersion(opts.version)
        return
      }

      ui.displayLevel = args.verbose ? DisplayLevel.Verbose :
        args.silent ? DisplayLevel.Silent : DisplayLevel.Normal

      const [command, cmdArgv] = getCommandExecution(commands, trimmedArgv.slice(1))
      if (command) {
        log.debug(`found command: ${command.name}`)
        if (args.help || !hasProperty(command, 'run')) {
          ui.showHelp(command)
          return
        }

        let cmdArgs
        try {
          cmdArgs = parseArgv(command, cmdArgv)
        }
        catch (e) {
          ui.error(e.message)
          ui.showHelp(command)
          throw e
        }

        try {
          return await (command as any).run(cmdArgs, cmdArgv)
        }
        catch (e) {
          ui.error(`command ${command.name} throws: ${e}`)
          throw e
        }
      }

      if (args.help) {
        ui.showHelp(opts)
        return
      }

      if (hasProperty(opts, 'run') && (opts.arguments && opts.arguments.length > 0 || args._.length === 0)) {
        try {
          return await opts.run.call(context, trimmedArgs, trimmedArgv)
        }
        catch (e) {
          ui.error(`${cli.name} throws: ${e}`)
          throw e
        }
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
  AName extends string,
  BName extends string,
  SName extends string,
  NName extends string
>(options: Cli.ConstructOptions<Config, Context, AName, BName, SName, NName>): Cli.RunContext<Config, Context> {
  // as any because `config` is `Config | undefined`
  const context = {
    name: options.name,
    version: options.version,
    config: options.config,
    cwd: process.cwd(),
    ...options.context
  } as any
  if (!context.ui) context.ui = new PlainPresenter()

  if (options.config || options.configName) {
    const configName = options.configName || options.name
    context.config = requiredDeep(options.config ?? {}, loadConfig(`${configName}.json`, { cwd: context.cwd }))
    log.debug('Loaded config', context.config)
  }

  return context
}

function buildParseOption<
  Config extends Record<string, JSONTypes> | undefined,
  Context,
  AName extends string,
  BName extends string,
  SName extends string,
  NName extends string
>(options: Cli.ConstructOptions<Config, Context, AName, BName, SName, NName>): Cli.ConstructOptions<Config, Context, AName, BName, SName, NName> {
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

function removeCliLevelOptions(args: Cli.RunArgs, argv: string[]): [Cli.RunArgs<any, any, any, any>, string[]] {
  const keys = ['version', 'verbose', 'silent', 'debug-cli']
  const keys2 = ['--version', '--verbose', '--silent', '--debug-cli', '-V', '-v']
  return [reduceKey(args, (p, v) => {
    if (keys.indexOf(v) === -1) p[v] = args[v]
    return p
  }, {} as any), argv.filter(a => keys2.indexOf(a) === -1)]
}

function buildCommands<
  Config extends Record<string, JSONTypes> | undefined,
  Context,
  AName extends string,
  BName extends string,
  SName extends string,
  NName extends string
>(context: Cli.RunContext<Config, Context>, options: Cli.ConstructOptions<Config, Context, AName, BName, SName, NName>): CommandInstance[] {
  if (hasProperty(options, 'commands')) {
    return options.commands.map(cmd => createCliCommand(cmd, context, []))
  }
  return []
}

function createCliCommand<
  Config extends Record<string, JSONTypes> | undefined,
  Context,
  >(cmd: Cli.Command<Config, Context>, parent: Cli.RunContext<Config, Context>, parentNames: string[]) {
  log.debug('creatingCommand:', [...parentNames, cmd.name].join(' > '))
  validateCliCommand(cmd)

  const context: Cli.RunContext<Config, Context> = {
    ...parent,
    ...omit(cmd, 'commands', 'config', 'context'),
  }

  const command = {
    ...cmd,
    parent: pick(parent, 'name')
  }

  if (hasProperty(command, 'run')) {
    command.run = command.run.bind(command.context ? { ...command.context, ...context } : context)
  }

  if (command.commands) {
    const newParentNames = [...parentNames, cmd.name]
    command.commands = command.commands.map(c => createCliCommand(c, context, newParentNames))
  }
  return command as any
}

function validateCliCommand(cmd: Cli.Command<any, any>) {
  validateArgument(cmd)
  validateOptions(cmd)
}

function validateArgument(cmd: Cli.Command) {
  if (hasProperty(cmd, 'run') && cmd.arguments) {
    const args = cmd.arguments
    const multiIndex = args.findIndex(arg => arg.multiple === true)
    if (multiIndex !== -1 && multiIndex !== args.length - 1) {
      throw new MultipleArgumentNotLastEntry(cmd.name, args[multiIndex].name)
    }
  }
}

function validateOptions(cmd: Cli.Command<any, any>) {
  if (hasProperty(cmd, 'run') && cmd.options) {
    const options = cmd.options
    const strOptionNames = options.string ? Object.keys(options.string) : []
    const numOptionNames = options.number ? Object.keys(options.number) : []
    const boolOptionNames = options.boolean ? Object.keys(options.boolean) : []
    const names: string[] = []
    strOptionNames.forEach(n => {
      if (names.indexOf(n) === -1) names.push(n)
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
): [CommandInstance | undefined, string[]] {
  let cmdExecution: [CommandInstance | undefined, string[]] = [undefined, []]
  if (argv.length === 0) return cmdExecution

  const cmdArgv = [...argv]
  const nameOrAlias = cmdArgv[0]
  commands.forEach(cmd => {
    const match = cmd.name === nameOrAlias ||
      (!!cmd.alias && cmd.alias.indexOf(nameOrAlias) !== -1)
    if (!match) return

    cmdExecution = [cmd, cmdArgv]
    if (!cmd.commands) return

    const nested = getCommandExecution(cmd.commands, cmdArgv.slice(1))
    if (nested[0]) cmdExecution = nested
  })
  return cmdExecution
}
