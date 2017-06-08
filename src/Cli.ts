import { setLevel, logLevel, Logger } from 'aurelia-logging'

import { Command, CommandSpec, createCommand } from './Command'
import { getCommand } from './util'
import { parseArgv } from './parseArgv'
import { UI } from './UI'

export interface Config {
  ui: Logger
}

export interface ICommand {
  name: string
  process(argv, rawArgv): void
}

export class Cli {
  options = {
    boolean: {
      'help': {
        description: 'Print help message',
        alias: ['h']
      },
      'version': {
        description: 'Print the CLI version',
        alias: ['v']
      },
      'verbose': {
        description: 'Turn on verbose logging',
        alias: ['V']
      },
      'silent': {
        description: 'Turn off logging'
      }
    }
  }
  commands: Command[]
  constructor(public name: string, public version: string, commandSpecs: CommandSpec[], public ui: UI) {
    this.commands = commandSpecs.map(s => {
      const cmd = createCommand(s)
      cmd.ui = ui
      cmd.parent = this
      return cmd
    })
  }

  parse(rawArgv: string[]) {
    const args = parseArgv(this, rawArgv.slice(1))
    this.process(args, rawArgv.slice(1))
  }

  process(args, rawArgv) {
    if (args.version) {
      this.showVersion()
    }
    else {
      const l = args.verbose ?
        logLevel.debug : args.silent ?
          logLevel.none : logLevel.info
      setLevel(l)

      const command = getCommand(args._.shift(), this.commands)
      if (!command) {
        this.ui.showHelp(this)
      }
      else if (args.help) {
        this.ui.showHelp(command)
      }
      else {
        command.run(rawArgv.slice(1).filter(x => ['--verbose', '-V', '--silent'].indexOf(x) === -1))
      }
    }
  }
  showVersion() {
    this.ui.info(this.version)
  }
}
