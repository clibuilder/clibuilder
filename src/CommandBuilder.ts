import minimist = require('minimist')
import camelCase = require('camel-case')

import { Argument } from './Argument'
import { Option } from './Option'
import { CliBuilder } from './CliBuilder'

export class CommandBuilder {
  aliases: string[] = []
  arguments: Argument[] = []
  options: Option[] = []
  descriptions: string[] = []
  private builders: CommandBuilder[] = []
  private actionFn: Function | undefined
  constructor(public commandName: string, public program: CliBuilder, private isRoot: boolean) {
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
    this.descriptions = []
    this.aliases = []
    this.options = []
    this.actionFn = undefined
    return this
  }
  command(cmd: string) {
    const builder = new CommandBuilder(cmd, this.program, false)
    this.builders.push(builder)
    return builder
  }
  description(description: string) {
    this.descriptions.push(description)
    return this
  }
  option(flags: string, description: string, valuesDescription?: { [name: string]: string }) {
    const option = new Option(flags, description, valuesDescription)
    this.options.push(option)
    return this
  }
  /**
   * Defines action of the command
   * @template A Type of the args
   * @template O Type of the options
   */
  action<A, O>(fn: (args: A, options: O) => boolean | void) {
    this.actionFn = fn
    return this
  }

  build(argv: string[]) {
    const options = this.buildOptions(argv)
    const unknownOptions = (options._ as any).unknown
    const cmd = this.commandName === '' ? '' : options._.shift() || ''
    if (this.builders.length && options._.length) {
      if (this.commandName !== '' && this.commandName === cmd) {
        argv.splice(argv.indexOf(this.commandName))
      }

      let command
      for (const builder of this.builders) {
        command = builder.build(argv)
        if (command) {
          break
        }
      }
      if (command) {
        return command
      }
    }

    if (this.commandName === cmd || ~this.aliases.indexOf(cmd)) {
      if (unknownOptions) {
        return () => {
          this.program.error(`\nUnknown option "${unknownOptions[0]}"\n`)
          this.program.log(this.help())
        }
      }

      const args = {}
      this.arguments.forEach(a => {
        if (a.variadic) {
          args[a.name] = options._.splice(0)
        }
        else {
          args[a.name] = options._.shift()
        }
      })

      // If there are anything left in the argv, treat it as an unknown command
      if (options._.length === 0) {
        return () => {
          if (!this.actionFn || this.actionFn(args, options) === false) {
            this.program.log(this.help())
          }
        }
      }
    }
    return undefined
  }
  help() {
    let sections = (this.isRoot ? this.program.programHelpTemplate : this.program.commandHelpTemplate).split('\n')
    return sections.map((token) => this.buildHelp(token)).filter(value => value !== undefined).join('\n')
  }
  getCommandNames() {
    let names: string[] = [] // this.commandName === '' ? [] : [this.commandName, ...this.aliases]
    this.builders.forEach(builder => {
      names = names.concat([builder.commandName, ...builder.aliases]).concat(builder.getCommandNames())
    })
    return names
  }
  hasAction() {
    // if the is a root command, assume it has action
    return this.isRoot || !!this.actionFn
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
    if (token === '') {
      return token
    }

    const tokenName = token.slice(1, -1)
    this.program.helpSectionBuilder.builder = this
    return this.program.helpSectionBuilder[tokenName]()
  }
}
