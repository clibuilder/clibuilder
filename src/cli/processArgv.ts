import { filterKey, forEachKey } from 'type-plus'
import yargs from 'yargs-parser'
import type { cli } from './cli'
import { AppContext } from './createAppContext'

export function processArgv2(context: AppContext, commands: cli.Command[], argv: string[]): {
  command: cli.Command,
  args: { _: string[] } & Record<string, any>
} {
  // remove node and cli name
  argv = argv.slice(2)
  const baseCommand = commands.pop()!
  commands = commands.sort((a, b) => a.name.length - b.name.length)
  const result: {
    command: cli.Command,
    args: { _: string[] } & Record<string, any>
  } = processArgvInternal(context, baseCommand, argv)!
  if (result.args.version) return result

  for (let i = 0; i < commands.length; i++) {
    const result = processArgvInternal(context, commands[i], argv)
    if (result) return result
  }

  if (Object.keys(result.args).length === 1) {
    result.args = { ...result.args, help: true }
  }
  return result
}

function processArgvInternal(context: AppContext, command: cli.Command, argv: string[]) {
  const options = addOptions({
    alias: {}, default: {},
    configuration: {
      'strip-aliased': true,
      'camel-case-expansion': false
    }
  }, command.options)
  const args = yargs(argv, options)
  const numOptions = command.options?.number
  if (numOptions) {
    forEachKey(numOptions, (k) => {
      if (!numOptions[k].multiple && Array.isArray(args[k])) {
        // TODO: log warning
        context.ui.warn(`multiple '--${k}' received while expecting only one. Only the last value is used.`)
        args[k] = args[k].pop()
      }
    })
  }
  if (args._.length === 0) {
    return command.name ? undefined : { command, args }
  }

  if (command.arguments && command.arguments.length > 0) {
    return { command, args }
  }
  return { command, args }
}

export function processArgv(commands: cli.Command[], argv: string[]) {
  const yargsOptions = toYargsOption(commands)
  // const args = yargs(argv.slice(2), yargsOptions)
  const args = yargs(argv, yargsOptions)
  args._.shift()
  fixStringOptions(args)
  fixBooleanOptions(args, argv)
  clearAlias(commands, args)

  const command = findMatchingCommand(commands, {
    ...args,
    _: ['', ...args._.slice(1)]
  })
  return { command, args }
}

function toYargsOption(commands: cli.Command[]) {
  return commands.reduce(
    (options, cmd) => addOptions(options, cmd.options),
    { alias: {}, default: {} } as Record<string, any>)
}

function fixStringOptions(args: yargs.Arguments) {
  Object.keys(args).forEach(k => {
    if (typeof args[k] === 'string') {
      args[k] = args[k].trim()
    }
  })
}

/**
 * `yargs-parser` will fill in `false` on boolean even if the option does not have default set.
 * This will fix that issue by deleting the values and alias.
 */
function fixBooleanOptions(args: yargs.Arguments, argv: string[]) {
  const inputArgs = yargs(argv)
  Object.keys(args).forEach(k => {
    if (args[k] === false && inputArgs[k] === undefined)
      delete args[k]
  })
}

function clearAlias(commands: cli.Command[], args: yargs.Arguments) {
  commands.forEach(command => {
    if (!command.options)
      return
    const alias: string[] = []
    alias.push(...getAlias(command.options.boolean))
    alias.push(...getAlias(command.options.string))
    alias.push(...getAlias(command.options.number))
    Object.keys(args).forEach(k => {
      if (alias.indexOf(k) !== -1)
        delete args[k]
    })
  })
}

function getAlias(options: { [k: string]: { alias?: string[] } } | undefined) {
  if (!options) return []

  return filterKey(options, k => !!options[k].alias).reduce<string[]>((p, k) => p.concat(options[k].alias!), [])
}

function addOptions(options: Record<string, any>, cmdOptions: cli.Command.Options | undefined) {
  fillOptions(options, cmdOptions, 'boolean')
  fillOptions(options, cmdOptions, 'string')
  fillOptions(options, cmdOptions, 'number')
  return options
}

function fillOptions(result: Record<string, any>, options: cli.Command.Options | undefined, typeName: keyof cli.Command.Options) {
  if (options?.[typeName]) {
    const values = options[typeName]!
    result[typeName] = Object.keys(values)
    result[typeName].forEach((k: string) => {
      const v = values[k]
      if (v.alias) {
        result.alias[k] = v.alias
      }
      if (v.default !== undefined) {
        result.default[k] = v.default
      }
    })
  }
}

function findMatchingCommand(commands: cli.Command[], args: Record<string, any> & { _: string[] }) {
  const name = args._.shift()
  return commands.find(cmd => cmd.name === name)!
}
