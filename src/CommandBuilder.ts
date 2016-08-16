import minimist = require('minimist')
import wordwrap = require('wordwrap')
import camelCase = require('camel-case')

import { pad } from './utils'
import { Argument } from './Argument'
import { Option } from './Option'
import { CliBuilder } from './CliBuilder'

export class CommandBuilder {
  private _description: string | undefined
  private aliases: string[] = []
  private arguments: Argument[] = []
  private builders: CommandBuilder[] = []
  private fn: Function
  private options: Option[] = []
  constructor(private commandName: string, private program: CliBuilder, private isRoot: boolean) {
    this.clear()
  }

  alias(name: string) {
    this.aliases.push(name)
    return this
  }
  argument(arg: string, description?: string, choicesDescription?: { [name: string]: string }) {
    const argument = new Argument(arg, description, choicesDescription)
    this.arguments.push(argument)
    return this
  }
  /**
   * Clear settings for this command and start over.
   * This is mostly used internally.
   */
  clear() {
    this._description = undefined
    this.aliases = []
    this.options = []
    this.fn = () => this.program.error(`\nCommand "${this.commandName}" does not have action defined\n`)
    return this
  }
  command(cmd: string) {
    const builder = new CommandBuilder(cmd, this.program, false)
    this.builders.push(builder)
    return builder
  }
  description(description: string) {
    this._description = description
    return this
  }
  option(flags: string, description: string, valuesDescription?: { [name: string]: string }) {
    const option = new Option(flags, description, valuesDescription)
    this.options.push(option)
    return this
  }
  action(fn) {
    this.fn = fn
    return this
  }

  build(argv: string[]) {
    const options = this.buildOptions(argv)
    const unknownOptions = (options._ as any).unknown
    const cmd = this.commandName === '' ? '' : options._.shift() || ''

    if (this.builders.length === 0 && (this.commandName === cmd || ~this.aliases.indexOf(cmd))) {
      if (unknownOptions) {
        return () => {
          this.program.error(`\nUnknown option ${unknownOptions[0]}`)
          this.program.log(this.help())
        }
      }
      const args = {}
      this.arguments.forEach(a => {
        if (a.variadic) {
          args[a.name] = options._
        }
        else {
          args[a.name] = options._.shift()
        }
      })
      return () => {
        if (this.fn(args, options) === false) {
          this.program.log(this.help())
        }
      }
    }

    let command
    this.builders.forEach(builder => {
      command = builder.build(argv)
      return !command
    })

    if (!command) {
      command = () => {
        this.program.error(`\nUnknown command ${cmd}\n`)
      }
    }
    return command
  }
  help() {
    let sections = (this.isRoot ? this.program.programHelpTemplate : this.program.commandHelpTemplate).split('\n')
    return sections.map((token) => this.buildHelp(token)).filter(value => value !== undefined).join('\n')
  }
  private buildOptions(argv) {
    const unknownOptions: string[] = []
    const minimistOption = {
      string: [] as string[], boolean: [] as string[], alias: {}, unknown: (option: string) => {
        if (option.indexOf('-') === 0) {
          unknownOptions.push(option)
          return false
        }
        return true
      }
    }

    this.options.forEach(option => {
      const long = option.long ? option.long.slice(2) : undefined
      const short = option.short ? option.short.slice(1) : undefined
      const cmd = (long || short) as string
      if (option.bool) {
        minimistOption.boolean.push(cmd)
      }
      else {
        minimistOption.string.push(cmd)
      }
      if (long) {
        const alias: string[] = []
        const camel = camelCase(long)
        if (camel !== long) {
          alias.push(camel)
        }
        if (short) {
          alias.push(short)
        }
        if (alias.length) {
          minimistOption.alias[long] = alias
        }
      }
    })
    const options = minimist(argv, minimistOption)
    if (unknownOptions.length > 0) {
      (options._ as any).unknown = unknownOptions
    }
    return options
  }
  private buildHelp(token: string) {
    const wrap = wordwrap(4, 80)
    switch (token) {
      case '<usage>':
        return `Usage: ${this.program.name}${this.commandName !== '' ? ' ' + this.commandName : ''}${this.builders.length ? ' <command>' : ''}\n`
      case '<description>':
        return this._description ? `${wrap(this._description)}\n` : undefined
      case '<arguments>':
        if (!this.arguments.length) {
          return undefined
        }

        const argWidth = this.arguments.reduce((max, argument) => {
          max = Math.max(max, argument.arg.length)
          if (argument.choiceDescription) {
            const keys = Object.keys(argument.choiceDescription)
            max = keys.reduce((max, key) => {
              // The keys will be 2 spaces indented
              return Math.max(max, key.length + 2)
            }, max)
          }
          return max
        }, 0)

        return `Arguments:\n${this.arguments.map((argument) => {
          const lines = [`${pad(argument.arg, argWidth)}  ${argument.description}`]
          if (argument.choiceDescription) {
            const keys = Object.keys(argument.choiceDescription)
            keys.forEach(key => {
              const description = (argument.choiceDescription as any)[key]
              lines.push(`  ${pad(key, argWidth - 2)}  ${description}`)
            })
          }
          return lines.join('\n')
        }).join('\n')}\n`
      case '<commands>':
        const commandNames = this.getCommandNames()
        if (!commandNames.length) {
          return undefined
        }
        return `Commands:\n${wrap(commandNames.join(', '))}\n`
      case '<options>':
        if (!this.options.length) {
          return undefined
        }
        const width = this.options.reduce((max, option) => {
          max = Math.max(max, option.flags.length)
          if (option.valuesDescription) {
            const keys = Object.keys(option.valuesDescription)
            max = keys.reduce((max, key) => {
              // The keys will be 2 spaces indented
              return Math.max(max, key.length + 2)
            }, max)
          }
          return max
        }, 0)

        return `Options:\n${this.options.map((option) => {
          const lines = [`${pad(option.flags, width)}  ${option.description}`]
          if (option.valuesDescription) {
            const keys = Object.keys(option.valuesDescription)
            keys.forEach(key => {
              const description = (option.valuesDescription as any)[key]
              lines.push(`  ${pad(key, width - 2)}  ${description}`)
            })
          }
          return lines.join('\n')
        }).join('\n')}\n`
      case '<version>':
        return `${this.program.name}@${this.program.version} ${this.program.location}\n`
      case '<alias>':
        if (!this.aliases.length) {
          return ''
        }
        return `Alias:\n${wrap(this.aliases.join(', '))}\n`
      default:
        return token
    }
  }
  private getCommandNames() {
    let names: string[] = [] // this.commandName === '' ? [] : [this.commandName, ...this.aliases]
    this.builders.forEach(builder => {
      names = names.concat([builder.commandName, ...builder.aliases]).concat(builder.getCommandNames())
    })
    return names
  }
}
