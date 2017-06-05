import merge = require('lodash.merge')

import { UI } from './UI'

export interface CommandSpec {
  /**
   * Name of the command.
   */
  name: string
  arguments?: Argument[]
  commands?: Command[]
  description?: string
  options?: {
    boolean?: BooleanOptions,
    string?: StringOptions
  }
  alias?: string[]
  run?: (this: Command, args) => void
}

export function createCommand(spec: CommandSpec): Command {
  const result = merge({
    run: () => { return }
  }, spec)

  if (result.commands) {
    result.commands.forEach(c => c.parent = result)
  }

  return result
}

export namespace Command {
  export interface Options {
    boolean?: BooleanOptions,
    string?: StringOptions
  }
}
export interface Command extends CommandSpec {
  name: string
  options: Command.Options
  ui: UI
  run(this: Command, args): void
}

export interface Argument {
  name: string,
  required?: boolean
}

export interface BooleanOptions {
  [optionName: string]: {
    description: string
    alias?: string[]
    default?: boolean
  }
}

export interface StringOptions {
  [optionName: string]: {
    description: string
    alias?: string[]
    default?: boolean
  }
}
