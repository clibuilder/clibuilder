import minimist = require('minimist')
import { setLevel, logLevel } from 'aurelia-logging'


import { getCommandAndAliasNames, getCommand } from './Command'
import { Command } from './interfaces'

export interface Options {
  name: string,
  version: string,
  commands: Command[]
}
export interface Cli {
  process(argv: string[]): void
}
export function create(options: Options): Cli {
  return {
    name: options.name,
    version: options.version,
    commands: options.commands,
    process(argv: string[]) {
      const args = parseArgv(argv)
      const cmd = args._.shift()
      if (args.version) {
        this.showVersion()
      }
      else if (args.help || !cmd) {
        this.showHelp()
      }
      else {
        const command = getCommand(cmd, this.commands)
        if (!command) {
          this.showHelp()
        }
        else {
          this.setLevel(args.verbose ?
            logLevel.debug : args.silent ?
              logLevel.none : logLevel.info)
          command.run(argv.slice(2))
        }
      }
    },
    showHelp() {
      const help = this.getHelp()
      console.info(`
Usage: ${this.name} ${help}`)
      return
    },
    showVersion() {
      console.info(this.version)
    },
    getHelp() {
      const names = getCommandAndAliasNames(this.commands)
      return `<command>

Commands:
  ${names.join(', ')}

${this.name} <command> -h      Get help for <command>

Options:
  [-v|--version]          Print the CLI version
  [-V|--verbose]          Turn on verbose logging
  [--silent]              Turn off logging
`
    },
    setLevel(level) {
      setLevel(level)
    }
  } as Cli
}

function parseArgv(argv) {
  return minimist<Argv>(argv.slice(2), {
    boolean: ['version', 'verbose', 'help', 'silent'],
    alias: {
      version: ['v'],
      verbose: ['V'],
      help: ['h']
    },
    unknown: () => true
  })
}

interface Argv {
  silent: boolean
  verbose: boolean
  version: boolean
}
