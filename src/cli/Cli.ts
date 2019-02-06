import { addAppender, logLevel } from '@unional/logging';
import { ColorAppender } from 'aurelia-logging-color';
import { RecursivePartial } from 'type-plus';
import yargs from 'yargs-parser';
import { CliArgs, parseArgv } from '../argv-parser';
import { CliCommand, CliCommandInstance, createCliCommand, getCliCommand } from '../cli-command';
import { log } from '../log';
import { DisplayLevel, HelpPresenter, LogPresenter, VersionPresenter } from '../presenter';
import { buildContext } from './CliContext';
import { CliContext } from './interfaces';
import { loadConfig } from './loadConfig';

export type CliOption<Config, Context> = {
  name: string
  version: string
  commands: CliCommand<Config, Context>[]
}

const args = yargs(process.argv)
// istanbul ignore next
if (args['debug-cli']) {
  addAppender(new ColorAppender())
  log.level = logLevel.debug
}

/**
 * Create a new Cli.
 * @type Config is the shape of the config inside the `<cli-name>.json` file.
 * If you don't have config and need to specify the generics, you can set it to `any`.
 * @type Context is additional context to be added to the cli.
 */
export class Cli<
  Config extends Record<string, any> = Record<string, any>,
  Context extends Record<string, any> = Record<string, any>
  > {
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
      },
      'debug-cli': {
        description: 'Display clibuilder debug messages'
      }
    }
  }
  commands: CliCommandInstance<Config, Context>[] = []
  name: string
  version: string
  config: Config
  context: CliContext & Context
  private ui: LogPresenter & HelpPresenter & VersionPresenter

  /**
   * Create a new Cli instance.
   * @param context additional context available to the cli and its commands.
   */
  constructor(
    option: CliOption<Config, Pick<CliContext, 'cwd'> & Context>,
    context?: RecursivePartial<CliContext> & Context
  ) {
    this.name = option.name
    this.version = option.version

    this.context = buildContext(context)
    const cwd = this.context.cwd
    log.debug('cwd', cwd)

    this.config = loadConfig(`${this.name}.json`, { cwd })
    log.debug('Loaded config', this.config)

    this.ui = this.context.presenterFactory.createCliPresenter({ name: this.name })
    option.commands.forEach(command => {
      this.addCliCommand(command)
    })
  }

  parse(rawArgv: string[]) {
    const args = parseArgv(this, rawArgv.slice(1))
    return this.process(args, rawArgv.slice(1))
  }

  protected addCliCommand(command: CliCommand<Config, Context>) {
    this.commands.push(createCliCommand(command, this))
  }

  private process(args: CliArgs, rawArgv: string[]) {
    if (args.version) {
      this.ui.showVersion(this.version)
      return Promise.resolve()
    }
    const command = getCliCommand(args._, this.commands)
    const cmdChainCount = getCmdChainCount(command)
    if (!command) {
      this.ui.showHelp(this)
      return Promise.resolve()
    }

    if (args.help) {
      this.ui.showHelp(command)
      return Promise.resolve()
    }

    const cmdArgv = rawArgv.slice(cmdChainCount).filter(x => ['--verbose', '-V', '--silent', '--debug-cli'].indexOf(x) === -1)

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
