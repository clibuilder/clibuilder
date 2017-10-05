import { Command, CommandSpec } from './Command'
import { DisplayLevel } from './Display'
import { CliContext } from './interfaces'
import { parseArgv } from './parseArgv'
import { LogPresenter, HelpPresenter, VersionPresenter } from './Presenter'
import { PresenterFactory } from './PresenterFactory'
import { createCommand, getCommand } from './util'

export class Cli<Context extends CliContext & { [i: string]: any } = CliContext> {
  get cwd() {
    return this._cwd
  }
  set cwd(value) {
    this._cwd = value
    this.commands.forEach(c => c.cwd = value)
  }
  _cwd: string
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
  private ui: LogPresenter & HelpPresenter & VersionPresenter
  constructor(public name: string, public version: string, commandSpecs: CommandSpec[], context: Partial<Context> = {} as any) {
    const cwd = context.cwd || process.cwd()
    const presenterFactory = context.presenterFactory || new PresenterFactory()

    this.ui = presenterFactory.createCliPresenter(this)
    this.commands = commandSpecs.map(s => {
      const cmd = createCommand(s, { cwd })
      cmd.ui = presenterFactory.createCommandPresenter(cmd)
      cmd.parent = this
      return cmd
    })
  }

  parse(rawArgv: string[]) {
    const args = parseArgv(this, rawArgv.slice(1))
    return this.process(args, rawArgv.slice(1))
  }

  private process(args, rawArgv) {
    if (args.version) {
      this.ui.showVersion(this.version)
    }
    else {
      const command = getCommand(args._.shift(), this.commands)

      if (!command) {
        this.ui.showHelp(this)
      }
      else if (args.help) {
        command.ui.showHelp(command)
      }
      else {
        const cmdArgv = rawArgv.slice(1).filter(x => ['--verbose', '-V', '--silent'].indexOf(x) === -1)

        let cmdArgs
        try {
          cmdArgs = parseArgv(command, cmdArgv)
        }
        catch (e) {
          command.ui.error(e.message)
          command.ui.showHelp(command)
          return
        }

        const displayLevel = args.verbose ?
          DisplayLevel.Verbose : args.silent ?
            DisplayLevel.Silent : DisplayLevel.Normal
        command.ui.setDisplayLevel(displayLevel)
        return command.run(cmdArgs, cmdArgv)
      }
    }
  }
}
