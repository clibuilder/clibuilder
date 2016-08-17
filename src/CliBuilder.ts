import wordwrap = require('wordwrap')
import { Argument } from './Argument'
import { CommandBuilder } from './CommandBuilder'
import { Option } from './Option'
import { pad } from './utils'

export interface HelpSectionBuilders {
  /**
   * Builds usage section help message
   * @param builder The CommandBuilder itself.
   */
  usage(builder: CommandBuilder): string | undefined
  /**
   * Builds description section help message
   * @param description The desciption specified by `description()`
   */
  description(description: string): string | undefined
  /**
   * Builds argument section help message
   * @param args The argument list. Guaranteed non empty.
   */
  arguments(args: Argument[]): string | undefined
  /**
   * Build commands section help message
   * @param names Names of the command. Guaranteed non empty.
   */
  commands(names: string[]): string | undefined
  /**
   * Build options section help message.
   * @param options The option list. Guaranteed non empty.
   */
  options(options: Option[]): string | undefined
  /**
   * Builds version section help message
   * @param name Name of the program
   * @param version Version of the program
   * @param location The directory where the program resides
   */
  version(name: string, version: string, location: string): string | undefined
  /**
   * Builds alias section help message
   * @param aliases The aliases list of the command. Guaranteed non empty.
   */
  alias(aliases: string[]): string | undefined
  /**
   * Builds no-action section help message
   * @param name The name of the command
   */
  noAction(name: string): string | undefined
}

export class CliBuilder {
  version: string
  /**
   * The help template for the program
   */
  programHelpTemplate = `
<usage>
<description>
<arguments>
<commands>
<options>
<version>`
  /**
   * The help template for each command
   */
  commandHelpTemplate = `
<usage>
<description>
<arguments>
<commands>
<options>
<alias>
<noAction>`

  name: string
  location: string
  log = console.log
  error = console.error
  /**
   * Help section builder used to create help output.
   * You can replace this object entirely or replace a particular section of it.
   * Also, remember they are used by both program and command help.
   * You should take that into consideration when you are overriding them.
   * Pay attention on what do they receive in the function.
   */
  helpSectionBuilders: HelpSectionBuilders = {
    usage: function (builder: CommandBuilder): string | undefined {
      return `Usage: ${builder.program.name}${builder.commandName !== '' ? ' ' + builder.commandName : ''}${builder.getCommandNames().length ? ' <command>' : ''}\n`
    },
    description: function (description: string): string | undefined {
      const wrap = wordwrap(4, 80)
      return `${wrap(description)}\n`
    },
    arguments: function (args: Argument[]): string | undefined {
      const argWidth = args.reduce((max, argument) => {
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

      return `Arguments:\n${args.map((argument) => {
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
    },
    commands: function (names: string[]): string | undefined {
      const wrap = wordwrap(4, 80)
      return `Commands:\n${wrap(names.join(', '))}\n`
    },
    options: function (options: Option[]): string | undefined {
      const width = options.reduce((max, option) => {
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

      return `Options:\n${options.map((option) => {
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
    },
    version: function (name: string, version: string, location: string): string | undefined {
      return `${name}@${version} ${location}\n`
    },
    alias: function (aliases: string[]): string | undefined {
      const wrap = wordwrap(4, 80)
      return `Alias:\n${wrap(aliases.join(', '))}\n`
    },
    noAction: function (name: string): string | undefined {
      return `The action of command "${name}" has not been defined`
    }
  }
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

  command(cmd: string = ''): CommandBuilder {
    if (cmd === '') {
      return this.builder.clear()
    }
    return this.builder.command(cmd)
  }

  start(argv) {
    const parts = argv[1].split('/')
    this.name = parts.pop()
    this.location = parts.join('/')

    const args = argv.slice(2)
    const command = this.builder.build(args)
    if (command) {
      command()
    }
    else {
      this.error(`\nUnknown command "${args}"\n`)
    }
  }
}
