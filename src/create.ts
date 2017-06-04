import { Cli } from './Cli'
import { Command } from './Command'
import { UI, createDefaultDisplay } from './UI'
import { Display } from './interfaces'


export interface Options {
  name: string,
  version: string,
  commands: Command[],
  display?: Display
}
export interface ICli {
  /**
   * Parse argv (from `process.argv`)
   */
  parse(rawArgv: string[])
}

export function create({ name, version, commands = [], display }: Options): ICli {
  display = display || createDefaultDisplay(name)
  return new Cli(name, version, commands, new UI(display))
}
