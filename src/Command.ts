import merge = require('lodash.merge')

import { parseArgv } from './parseArgv'

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
}

export class Command {
  name: string
  options: {
    boolean?: BooleanOptions,
    string?: StringOptions
  }
  alias: string[]
  parentCommand?: Command
  commands?: Command[]
  ui: any
  constructor(spec?: CommandSpec) {
    merge(this, {
      options: {
        boolean: {
          'help': {
            description: 'Print this help message',
            alias: ['h']
          }
        }
      }
    }, spec)
    if (this.commands) {
      this.commands.forEach(c => c.parentCommand = this)
    }
  }
  run(rawArgv: string[]): void {
    const args = parseArgv(this, rawArgv)
    this.process(args, rawArgv)
  }
  process(args, _rawArgv): void {
    if (args.help) {
      this.ui.showHelp(this)
    }
  }
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
