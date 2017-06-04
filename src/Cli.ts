import { setLevel, logLevel, Logger } from 'aurelia-logging'

import { Command } from './Command'
import { getCommand } from './util'
import { parseArgv } from './parseArgv'
import { UI } from './UI'

export interface Config {
  ui: Logger
}

export class Cli {
  options = {
    boolean: {
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
  constructor(public name: string, public version: string, public commands: Command[], public ui: UI) {
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
      const command = getCommand(args._.shift(), this.commands)
      if (!command) {
        this.ui.showHelp(this)
      }
      else {
        setLevel(args.verbose ?
          logLevel.debug : args.silent ?
            logLevel.none : logLevel.info)
        command.run(rawArgv.slice(1).filter(x => ['--verbose', '-V', '--silent'].indexOf(x) === -1))
      }
    }
  }
  showVersion() {
    this.ui.info(this.version)
  }
}
