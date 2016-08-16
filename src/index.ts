import minimist = require('minimist')
import wordwrap = require('wordwrap')

import { pad } from './utils'

export class Option {
  required: boolean
  optional: boolean
  bool: boolean
  short: string | undefined
  long: string | undefined
  constructor(public flags: string, public description: string = '') {
    this.required = !!~flags.indexOf('<')
    this.optional = !!~flags.indexOf('[')
    this.bool = !~flags.indexOf('-no-')
    const tokens = flags.split(/[ ,|]+/)
    if (!/^[[<]/.test(tokens[1])) {
      this.short = tokens.shift()
    }
    this.long = tokens.shift()
  }
}

export class CommandBuilder {
  private _description: string | undefined
  private aliases: string[] = []
  private builders: CommandBuilder[] = []
  private fn: Function
  private options: Option[] = []
  constructor(private commandName: string, private program: CliBuilder, private isRoot: boolean) {
    this.fn = () => this.program.error(`\nCommand "${this.commandName}" does not have action defined\n`)
  }

  alias(name: string) {
    this.aliases.push(name)
    return this
  }
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
  option(flags: string, description: string) {
    const option = new Option(flags, description)
    this.options.push(option)
    return this
  }
  action(fn) {
    this.fn = fn
    return this
  }

  build(argv: string[]) {
    const options = this.buildOptions(argv)
    const cmd = options._.shift() || ''
    const unknownOptions = (options._ as any).unknown
    if (this.commandName === cmd || ~this.aliases.indexOf(cmd)) {
      if (unknownOptions) {
        return () => {
          this.program.error(`\nUnknown option ${unknownOptions[0]}`)
          this.program.log(this.help())
        }
      }
      return () => {
        if (this.fn(options._, options) === false) {
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
      if (long && short) {
        minimistOption.alias[long] = [short]
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
          return Math.max(max, option.flags.length)
        }, 0)

        return `Options:\n${this.options.map((option) => `${pad(option.flags, width)}  ${option.description}`).join('\n')}\n`
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

export class CliBuilder {
  version: string
  /**
   * The help template for the program
   */
  programHelpTemplate = `
<usage>
<description>
<commands>
<options>
<version>`
  /**
   * The help template for each command
   */
  commandHelpTemplate = `
<usage>
<description>
<commands>
<options>
<alias>`

  name: string
  location: string
  log = console.log
  error = console.error
  private builder: CommandBuilder
  constructor() {
    this.builder = new CommandBuilder('', this, true)
    this.builder
      .option('-h, --help', 'output usage information')
      .option('-v, --version', 'output the version number')
      .action((args, options) => {
        if (options.version) {
          this.log(this.version)
        }
        else if (options.help) {
          this.log(this.builder.help())
        }
        else {
          this.log(this.builder.help())
        }
      })
  }

  command(cmd: string = '') {
    if (cmd === '') {
      return this.builder.clear()
    }
    return this.builder.command(cmd)
  }

  start(argv) {
    const parts = argv[1].split('/')
    this.name = parts.pop()
    this.location = parts.join('/')

    const command = this.builder.build(argv.slice(2))
    command()
  }
}

export default new CliBuilder()
