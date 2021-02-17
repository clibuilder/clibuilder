import { Omit } from 'type-plus'
import { clibuilder } from './clibuilder'
import { command } from './command'
import { createAppContext } from './createAppContext'

export function cli(options?: cli.Options) {
  return clibuilder(createAppContext(), options)
}

export namespace cli {
  export type Options = {
    /**
     * Name of the cli
     */
    name: string,
    version: string,
    description: string,
  }

  export type Builder<Config> = {
    readonly name: string,
    readonly version: string,
    readonly description: string,
    default<
      AName extends string,
      A extends command.Argument<AName>[],
      OName extends string,
      O extends command.Options<OName>
    >(command: command.DefaultCommand<Config, A, O>): Omit<Builder<Config>, 'default'> & Executable<Config>
  }

  export type Executable<Config> = {
    parse<R = any>(this: Executable.This<Config>, argv: string[]): Promise<R>
  }

  export namespace Executable {
    export type This<Config> = { commands: command.Command<Config>[] } & { description: string }
  }
}
