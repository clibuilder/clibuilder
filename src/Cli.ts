import { setLevel, logLevel, addAppender, getLogger, Logger } from 'aurelia-logging'
import { ColorAppender } from 'aurelia-logging-color'

import { Command } from './Command'
import { getCommand } from './util'

export interface Config {
  ui: Logger
}

let defaultAppender: any

export class Cli extends Command {
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
  constructor(name: string, public version: string, public commands: Command[], config: Config = {} as any) {
    super({ name })
    if (config.ui) {
      this.ui = config.ui
    }
    else {
      if (!defaultAppender) {
        defaultAppender = new ColorAppender()
        addAppender(defaultAppender)
      }
      this.ui = getLogger(name)
    }
  }

  run(rawArgv: string[]) {
    super.run(rawArgv.slice(1))
  }

  process(args, rawArgv) {
    super.process(args, rawArgv)
    if (args.version) {
      this.showVersion()
    }
    else {
      const command = getCommand(args._.shift(), this.commands)
      if (!command) {
        this.showHelp()
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
