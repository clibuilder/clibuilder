import { Command, CommandSpec } from './Command'
import { setDisplayLevel, DisplayLevel } from './DisplayLevel'
import { parseArgv } from './parseArgv'
import { ReportPresenter, PlainReportPresenter, CommandViewModel } from './ReportPresenter'
import { createCommand, getCommand } from './util'

export class Cli {
  static ReportPresenterClass: new (command: CommandViewModel) => ReportPresenter = PlainReportPresenter
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
  private ui: ReportPresenter
  constructor(public name: string, public version: string, commandSpecs: CommandSpec[]) {
    this.ui = new Cli.ReportPresenterClass(this)
    this.commands = commandSpecs.map(s => {
      const cmd = createCommand(s)
      cmd.ui = s.ReportPresenterClass ? new s.ReportPresenterClass(cmd) : this.ui
      cmd.parent = this
      return cmd
    })
  }

  parse(rawArgv: string[]) {
    const args = parseArgv(this, rawArgv.slice(1))
    this.process(args, rawArgv.slice(1))
  }

  private process(args, rawArgv) {
    if (args.version) {
      this.showVersion()
    }
    else {
      const level = args.verbose ?
        DisplayLevel.Verbose : args.silent ?
          DisplayLevel.Silent : DisplayLevel.Normal
      setDisplayLevel(level)

      const command = getCommand(args._.shift(), this.commands)
      if (!command) {
        // no matter what, the help message will be shown
        setDisplayLevel(DisplayLevel.Normal)
        this.ui.showHelp(this)
      }
      else if (args.help) {
        // no matter what, the help message will be shown
        setDisplayLevel(DisplayLevel.Normal)
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
