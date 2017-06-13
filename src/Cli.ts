import { Command, CommandSpec } from './Command'
import { DisplayLevel } from './Display'
import { parseArgv } from './parseArgv'
import { Presenter, PlainPresenter } from './Presenter'
import { createCommand, getCommand } from './util'

export class Cli {
  static PresenterClass: new (cli: Cli) => Presenter = PlainPresenter
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
  displayLevel: DisplayLevel
  private ui: Presenter
  constructor(public name: string, public version: string, commandSpecs: CommandSpec[]) {
    this.ui = new Cli.PresenterClass(this)
    this.commands = commandSpecs.map(s => {
      const cmd = createCommand(s)
      cmd.ui = s.PresenterClass ? new s.PresenterClass(this) : this.ui
      cmd.parent = this
      return cmd
    })
  }

  parse(rawArgv: string[]) {
    const args = parseArgv(this, rawArgv.slice(1))
    this.process(args, rawArgv.slice(1))
  }

  private process(args, rawArgv) {
    this.displayLevel = args.verbose ?
      DisplayLevel.Verbose : args.silent ?
        DisplayLevel.Silent : DisplayLevel.Normal

    if (args.version) {
      this.ui.showVersion()
    }
    else {
      const command = getCommand(args._.shift(), this.commands)
      if (!command) {
        // no matter what, the help message will be shown
        this.displayLevel = DisplayLevel.Normal
        this.ui.showHelp(this)
      }
      else if (args.help) {
        // no matter what, the help message will be shown
        this.displayLevel = DisplayLevel.Normal
        command.ui.showHelp(command)
      }
      else {
        const cmdArgs = rawArgv.slice(1).filter(x => ['--verbose', '-V', '--silent'].indexOf(x) === -1)
        command.run(cmdArgs)
      }
    }
  }
}
