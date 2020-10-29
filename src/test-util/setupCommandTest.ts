import { JSONTypes } from 'type-plus'
import { Cli, createCli } from '../create-cli'
import { createCliArgv } from './createCliArgv'
import { InMemoryPresenter } from './InMemoryPresenter'

export namespace testCommand {
  export type Options<Config, Context> = {
    config?: Config,
    context?: Context
  }
}

/**
 * Test a cli command.
 * Work with both regular command and plugin command.
 */
export function setupCommandTest<
  Command extends Cli.Command<Config, Context>,
  Config extends Record<string, JSONTypes> | undefined,
  Context
>(command: Command, ...args: string[]): {
  cli: Cli,
  ui: InMemoryPresenter,
  argv: string[]
}
export function setupCommandTest<
  Command extends Cli.Command<Config, Context>,
  Config extends Record<string, JSONTypes> | undefined,
  Context
>(command: Command, options: testCommand.Options<Config, Context>, ...args: string[]): {
  cli: Cli,
  ui: InMemoryPresenter,
  argv: string[]
}
export function setupCommandTest<
  Command extends Cli.Command<Config, Context>,
  Config extends Record<string, JSONTypes> | undefined,
  Context
>(command: Command, ...args: any[]) {
  const options: testCommand.Options<Config, Context> = args.length > 0 && typeof args[0] === 'object'
    ? args.shift() : {}
  const ui = new InMemoryPresenter()

  const cli = createCli({
    name: 'test-plugin-command',
    version: '0.0.0',
    description: '',
    config: options.config,
    context: {
      ui,
      ...options.context
    },
    commands: [command as any]
  })

  const argv = createCliArgv('test-plugin-command', command.name, ...args)
  return { cli, ui, argv }
}
