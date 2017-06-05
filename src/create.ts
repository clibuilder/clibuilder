import { Cli } from './Cli'
import { CommandSpec } from './Command'
import { UI, createDefaultDisplay } from './UI'
import { Display } from './interfaces'


export interface Options {
  name: string,
  version: string,
  commandSpecs: CommandSpec[],
  display?: Display
}
export interface ICli {
  /**
   * Parse argv (from `process.argv`)
   */
  parse(rawArgv: string[])
}

export function create({ name, version, commandSpecs, display }: Options): ICli {
  display = display || createDefaultDisplay(name)
  return new Cli(name, version, commandSpecs, new UI(display))
}
