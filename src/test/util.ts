import { Cli, Command, CommandSpec } from '../index'

import { noopCommand } from './commands'

export function createCommand(config?: CommandSpec): Command {
  return {
    ...noopCommand,
    ...config
  }
}

export function createNoCommandCli(): any {
  return createCliWithCommands()
}

export function createNoOpCli(): any {
  return createCliWithCommands(noopCommand)
}

export function createCliWithCommands(...commands: Array<CommandSpec & { process: any }>) {
  return new Cli('cli', '0.2.1', commands.map(c => createCommand(c)))
}

export function createArgv(...args) {
  args.unshift('node', 'cli')
  return args
}
