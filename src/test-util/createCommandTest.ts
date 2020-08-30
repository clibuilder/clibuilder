import { JSONTypes } from 'type-plus'
import { Cli } from '../create-cli'
import { createCliTest } from './createCliTest'

export function createCommandTest<
  Config extends Record<string, JSONTypes> | undefined,
  Context,
  AName extends string,
  BName extends string,
  SName extends string,
  NName extends string,
  >(command: Cli.Command<Config, Context, AName, BName, SName, NName>, ...args: string[]): ReturnType<typeof createCliTest>
export function createCommandTest<
  Config extends Record<string, JSONTypes> | undefined,
  Context,
  AName extends string,
  BName extends string,
  SName extends string,
  NName extends string,
  >(command: Cli.Command<Config, Context, AName, BName, SName, NName>, options?: { config?: Config, context?: Context }, ...args: string[]): ReturnType<typeof createCliTest>
export function createCommandTest<
  Config extends Record<string, JSONTypes> | undefined,
  Context,
  AName extends string,
  BName extends string,
  SName extends string,
  NName extends string,
  >(command: Cli.Command<Config, Context, AName, BName, SName, NName>, ...rest: any[]) {
  const [options, args] = parseRest<Config, Context>(rest)
  return createCliTest({
    name: 'cli',
    version: '1.0.0',
    commands: [command],
    ...options,
  }, ...[command.name, ...args])
}

function parseRest<Config, Context>(rest: any[]): [{ config?: Config, context?: Context } | undefined, string[]] {
  if (rest.length === 0 || typeof rest[0] === 'string') {
    return [undefined, rest]
  }
  else {
    const options = rest.shift()
    return [options, rest]
  }
}
