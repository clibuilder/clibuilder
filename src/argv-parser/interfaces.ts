import { CliCommand } from '../cli-command';

export interface Parsable {
  name: string,
  arguments?: CliCommand.Argument[],
  commands?: Parsable[],
  options?: CliCommand.Options,
}

export interface CliArgsWithoutDefaults {
  _: string[],
  [name: string]: any,
}
export interface CliArgs extends CliArgsWithoutDefaults {
  _defaults: string[],
}
