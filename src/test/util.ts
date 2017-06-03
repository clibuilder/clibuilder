import { Cli, Command, CommandSpec } from '../index'

import { noopCommand } from './commands'

export function createCommand(config?: CommandSpec): Command {
  return {
    ...noopCommand,
    ...config
  }
}

export function createNoCommandCli(name: string) {
  return createCliWithCommands(name)
}

export function createNoOpCli(name: string) {
  return createCliWithCommands(name, noopCommand)
}

export function createCliWithCommands(name: string, ...commands: Array<CommandSpec & { process: any }>) {
  return new Cli(name, '0.0.0', commands.map(c => createCommand(c)))
}

export function createArgv(...args) {
  args.unshift('node', 'cli')
  return args
}
