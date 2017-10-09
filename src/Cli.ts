import { Command } from './Command'
import { DisplayLevel } from './Display'
import { parseArgv } from './parseArgv'
import { LogPresenter, HelpPresenter, VersionPresenter } from './Presenter'
import { PresenterFactory } from './PresenterFactory'
import { createCommand, getCommand } from './util'

export interface CliOption {
  name: string
  version: string
  commands: Command[]
}

export interface CliContext {
  cwd: string
  presenterFactory: PresenterFactory
}

export class Cli<Context extends { [i: string]: any } = {}> {
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
  commands: Command.Instance[]
  name: string
  version: string
  displayLevel: DisplayLevel
  private ui: LogPresenter & HelpPresenter & VersionPresenter
  constructor(option: CliOption, context: Partial<CliContext> & Context = {} as any) {
    this.name = option.name
    this.version = option.version
    const cwd = context.cwd || process.cwd()
    const presenterFactory = context.presenterFactory || new PresenterFactory()

    this.ui = presenterFactory.createCliPresenter(this)
    this.commands = option.commands.map(s => {
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
