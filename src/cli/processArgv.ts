import yargs from 'yargs-parser'
import { clibuilderCommand } from './clibuilderCommand'
import { cli } from './types'

export function processArgv(commands: cli.Command[], argv: string[]) {
  const yargsOptions = toYargsOption(commands)
  const args = yargs(argv, yargsOptions)
  args._.shift()

  return { command: clibuilderCommand, args }
}

function toYargsOption(commands: cli.Command[]) {
  return commands.reduce(
    (options, cmd) => addOptions(options, cmd.options),
    { alias: {}, default: {} } as Record<string, any>)
}

function addOptions(options: Record<string, any>, cmdOptions: cli.Command.Options) {
  fillOptions(options, cmdOptions, 'boolean')
  fillOptions(options, cmdOptions, 'string')
  fillOptions(options, cmdOptions, 'number')
  return options
}

function fillOptions(result: Record<string, any>, options: cli.Command.Options, typeName: keyof cli.Command.Options) {
  if (options[typeName]) {
    const values = options[typeName]!
    result[typeName] = Object.keys(values)
    result[typeName].forEach((k: string) => {
      const v = values[k]
      if (v.alias) {
        result.alias[k] = v.alias
      }
      if (v.default) {
        result.default[k] = v.default
      }
    })
  }
}
