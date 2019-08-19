import { pick, RecursivePartial, required, requiredDeep } from 'type-plus';
import { CliArgs, parseArgv } from '../argv-parser';
import { CliCommand, CliCommandInstance, createCliCommand, getCliCommand } from '../cli-command';
import { log } from '../log';
import { DisplayLevel, HelpPresenter, LogPresenter, VersionPresenter, Inquirer } from '../presenter';
import { buildContext } from './CliContext';
import { CliContext } from './interfaces';
import { loadConfig } from './loadConfig';

export type CliOptions<Config, Context> = ({
  name: string,
  version: string,
  defaultConfig?: Config,
} | {
  name: string,
  version: string,
  defaultConfig?: Config,
  context: Context,
}) & ({
  commands: CliCommand<any, Context>[],
} | {
  arguments?: CliCommand.Argument[],
  options?: CliCommand.Options,
  alias?: string[],
  commands?: CliCommand<any, Context>[],
  run(this: Cli<Config, Context>, args: CliArgs, argv: string[]): void | Promise<any>,
})

export class Cli<Config, Context = unknown> {
  name: string
  version: string
  arguments: CliCommand.Argument[] | undefined
  options?: CliCommand.Options
  alias?: string[]
  commands: CliCommandInstance<any, any>[] = []
  config: Config | undefined
  context: CliContext & Context
  ui: LogPresenter & HelpPresenter & VersionPresenter & Inquirer
  private run?: (args: CliArgs, argv: string[]) => void | Promise<any>
  constructor(options: CliOptions<Config, Context & RecursivePartial<CliContext>>) {
    this.name = options.name
    this.version = options.version
    Object.assign(this, requiredDeep({
      options: {
        boolean: {
          'help': {
            description: 'Print help message',
            alias: ['h'],
          },
          'version': {
            description: 'Print the CLI version',
            alias: ['v'],
          },
          'verbose': {
            description: 'Turn on verbose logging',
            alias: ['V'],
          },
          'silent': {
            description: 'Turn off logging',
          },
          'debug-cli': {
            description: 'Display clibuilder debug messages',
          },
        },
      },
    }, pick(options, 'options', 'arguments', 'alias', 'run')))
    this.context = buildContext((options as any).context)
    log.debug('cwd', this.context.cwd)

    if (options.defaultConfig) {
      this.config = required<Config>(options.defaultConfig, loadConfig(`${this.name}.json`, { cwd: this.context.cwd }))
      log.debug('Loaded config', this.config)
    }

    this.ui = this.context.presenterFactory.createCliPresenter({ name: this.name })
    if (options.commands) {
      options.commands.forEach(command => this.addCliCommand(command))
    }
  }

  parse(argv: string[]) {
    const strippedArgv = argv.slice(1)
    const args = parseArgv(this, strippedArgv)
    return this.process(args, strippedArgv)
  }

  protected addCliCommand(command: CliCommand<Config, Context>) {
    this.commands.push(createCliCommand(command, this))
  }

  private async process(args: CliArgs, argv: string[]): Promise<any> {
    const command = getCliCommand(args._, this.commands)
    if (command) {
      return this.processCommand(command, args, argv)
    }

    if (args.version) {
      this.ui.showVersion(this.version)
    }
    else if (args.help || !this.run) {
      this.ui.showHelp(this)
    }
    else {
      const displayLevel = args.verbose ?
        DisplayLevel.Verbose : args.silent ?
          DisplayLevel.Silent : DisplayLevel.Normal
      this.ui.displayLevel = displayLevel
      return this.run(args, argv)
    }
  }
  private processCommand(command: CliCommandInstance<any, any>, args: CliArgs, argv: string[]) {
    if (args.help) {
      this.ui.showHelp(command)
      return Promise.resolve()
    }

    const cmdChainCount = getCmdChainCount(command)
    const cmdArgv = argv.slice(cmdChainCount).filter(x => ['--verbose', '-V', '--silent', '--debug-cli'].indexOf(x) === -1)
    let cmdArgs
    try {
      cmdArgs = parseArgv(command, cmdArgv)
    }
    catch (e) {
      this.ui.error(e.message)
      this.ui.showHelp(command)
      return Promise.resolve()
    }

    const displayLevel = args.verbose ?
      DisplayLevel.Verbose : args.silent ?
        DisplayLevel.Silent : DisplayLevel.Normal
    command.ui.displayLevel = displayLevel
    return Promise.resolve(command.run(cmdArgs, cmdArgv))
  }
}

function getCmdChainCount(command: CliCommandInstance<any, any> | undefined) {
  let count = 0
  let p: any = command
  while (p) {
    p = p.parent
    count++
  }
  return count - 1
}
