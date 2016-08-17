import wordwrap = require('wordwrap')

import { pad } from './utils'
import { CliBuilder } from './CliBuilder'
import { CommandBuilder } from './CommandBuilder'

/**
 * Help section builder
 */
export class HelpSectionBuilder {
  wordwrapStart = 4
  wordwrapStop = 80
  wordwrapOptions: wordwrap.Options
  /**
   * Indention for argument choices and option values.
   */
  valuesIndent = 2

  private program: CliBuilder
  constructor(public builder: CommandBuilder) {
    this.program = builder.program
  }

  getWordwrap(start?: number, stop?: number, options?: wordwrap.Options) {
    return wordwrap(
      start || this.wordwrapStart,
      stop || this.wordwrapStop,
      options || this.wordwrapOptions)
  }
  /**
   * Gets width needed to align arguments and options.
   */
  getPadWidth() {
    const argumentsWidth = this.builder.arguments.reduce((max, argument) => {
      max = Math.max(max, argument.arg.length)
      if (argument.choiceDescription) {
        const keys = Object.keys(argument.choiceDescription)
        max = keys.reduce((max, key) => {
          return Math.max(max, this.valuesIndent + key.length)
        }, max)
      }
      return max
    }, 0)
    const optionsWidth = this.builder.options.reduce((max, option) => {
      max = Math.max(max, option.flags.length)
      if (option.valuesDescription) {
        const keys = Object.keys(option.valuesDescription)
        max = keys.reduce((max, key) => {
          return Math.max(max, this.valuesIndent + key.length)
        }, max)
      }
      return max
    }, 0)

    return Math.max(argumentsWidth, optionsWidth)
  }
  /**
   * Builds usage section help message.
   * REPLACEABLE
   */
  usage(): string | undefined {
    return `Usage: ${this.builder.program.name}${this.builder.commandName !== '' ? ' ' + this.builder.commandName : ''}${this.builder.getCommandNames().length ? ' <command>' : ''}\n`
  }
  /**
   * Builds description section help message
   */
  description(): string | undefined {
    if (!this.builder.descriptions.length) {
      return undefined
    }

    const wrap = this.getWordwrap()
    return this.builder.descriptions.map(d => `${wrap(d)}`).join('\n')
  }
  /**
   * Builds argument section help message
   */
  arguments(): string | undefined {
    if (!this.builder.arguments.length) {
      return undefined
    }

    const padWidth = this.getPadWidth()
    return `Arguments:\n${this.builder.arguments.map((argument) => {
      const lines = [`${pad(argument.arg, padWidth)}  ${argument.description}`]
      if (argument.choiceDescription) {
        const keys = Object.keys(argument.choiceDescription)
        keys.forEach(key => {
          const description = (argument.choiceDescription as any)[key]
          lines.push(`${pad('', this.valuesIndent)}${pad(key, padWidth - this.valuesIndent)}  ${description}`)
        })
      }
      return lines.join('\n')
    }).join('\n')}\n`
  }
  /**
   * Build commands section help message
   */
  commands(): string | undefined {
    const commandNames = this.builder.getCommandNames()
    if (!commandNames.length) {
      return undefined
    }

    const wrap = this.getWordwrap()
    return `Commands:\n${wrap(commandNames.join(', '))}\n`
  }
  /**
   * Build options section help message.
   */
  options(): string | undefined {
    if (!this.builder.options.length) {
      return undefined
    }

    const padWidth = this.getPadWidth()

    return `Options:\n${this.builder.options.map((option) => {
      const lines = [`${pad(option.flags, padWidth)}  ${option.description}`]
      if (option.valuesDescription) {
        const keys = Object.keys(option.valuesDescription)
        keys.forEach(key => {
          const description = (option.valuesDescription as any)[key]
          lines.push(`${pad('', this.valuesIndent)}${pad(key, padWidth - this.valuesIndent)}  ${description}`)
        })
      }
      return lines.join('\n')
    }).join('\n')}\n`
  }
  /**
   * Builds version section help message
   */
  version(): string | undefined {
    return `${this.program.name}@${this.program.version} ${this.program.location}\n`
  }
  /**
   * Builds alias section help message
   */
  alias(): string | undefined {
    if (!this.builder.aliases.length) {
      return undefined
    }

    const wrap = this.getWordwrap()
    return `Alias:\n${wrap(this.builder.aliases.join(', '))}\n`
  }
  /**
   * Builds no-action section help message
   */
  noAction(): string | undefined {
    if (this.builder.hasAction()) {
      return undefined
    }

    return `The action of command "${this.builder.commandName}" has not been defined`
  }
}
