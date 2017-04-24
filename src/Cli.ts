import { setLevel, logLevel } from 'aurelia-logging'

import { Command } from './Command'
import { getCommand } from './util'

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
      'help': {
        description: 'Print this help message',
        alias: ['h']
      },
      'silent': {
        description: 'Turn off logging'
      }
    }
  }
  constructor(name: string, public version: string, public commands: Command[]) { super({ name }) }

  run(rawArgv: string[]) {
    super.run(rawArgv.slice(1))
  }

  process(args, rawArgv) {
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
        setLevel(args.verbose ?
          logLevel.debug : args.silent ?
            logLevel.none : logLevel.info)
        command.run(rawArgv.slice(1).filter(x => ['--verbose', '-V', '--silent'].indexOf(x) === -1 ))
      }
    }
  }
  showVersion() {
    console.info(this.version)
  }
}
