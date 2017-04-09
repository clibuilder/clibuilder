import * as minimist from 'minimist'
import { Command } from './interfaces'

export function parseCommand(rawArgv: string[], command: Command) {
  const options = toMinimistOption(command)
  return minimist(rawArgv, options)
}

function toMinimistOption(command: Command): minimist.Options {
  if (!command.options) {
    return {}
  }

  return {
    boolean: command.options.boolean ? Object.keys(command.options.boolean) : undefined,
    string: command.options.string ? Object.keys(command.options.string) : undefined,
    alias: command.options.alias,
    default: command.options.default
  }
}
