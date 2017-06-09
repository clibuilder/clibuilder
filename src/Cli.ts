import { setLevel, logLevel, Logger } from 'aurelia-logging'

import { Command, CommandSpec, createCommand } from './Command'
import { Display } from './interfaces'

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
  ui: UI
  constructor(public name: string, public version: string, commandSpecs: CommandSpec[], display: Display) {
    this.ui = new UI(display)
    this.commands = commandSpecs.map(s => {
      const cmd = createCommand(s)
      cmd.ui = s.display ? new UI(s.display) : this.ui
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
      const level = args.verbose ?
        logLevel.debug : args.silent ?
          logLevel.none : logLevel.info
      setLevel(level)

      const command = getCommand(args._.shift(), this.commands)
      if (!command) {
        // no matter what, the help message will be shown
        setLevel(logLevel.info)
        this.ui.showHelp(this)
      }
      else if (args.help) {
        // no matter what, the help message will be shown
        setLevel(logLevel.info)
        command.ui.showHelp(command)
      }
      else {
        const cmdArgs = rawArgv.slice(1).filter(x => ['--verbose', '-V', '--silent'].indexOf(x) === -1)
        command.run(cmdArgs)
      }
    }
  }
  showVersion() {
    this.ui.info(this.version)
  }
}
