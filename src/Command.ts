import merge = require('lodash.merge')

import { parseArgv } from './parseArgv'
import { HelpBuilder } from './HelpBuilder'

export interface CommandSpec {
  /**
   * Name of the command.
   */
  name: string
  arguments?: Argument[]
  commands?: Command[]
  description?: string
  options: {
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
  helpBuilder: HelpBuilder
  constructor(config) {
    merge(this, config)
    this.helpBuilder = this.helpBuilder || new HelpBuilder(this)
  }
  run(rawArgv: string[]): void {
    const args = parseArgv(this, rawArgv)
    this.process(args, rawArgv)
  }
  process(_args, _rawArgv): void {
    this.showHelp()
  }
  showHelp() {
    console.info(this.helpBuilder.build())
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
