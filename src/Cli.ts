import { addAppender, logLevel } from '@unional/logging'
import { ColorAppender } from 'aurelia-logging-color'
import yargs = require('yargs-parser')

import { CliCommand, CliCommandInstance } from './CliCommand'
import { createCliCommand } from './createCliCommand'
import { DisplayLevel } from './Display'
import { getCliCommand } from './getCliCommand'
import { PresenterFactory } from './interfaces'
import { log } from './log'
import { loadConfig } from './loadConfig'
import { parseArgv } from './parseArgv'
import { plainPresenterFactory } from './plainPresenterFactory'
import { LogPresenter, HelpPresenter, VersionPresenter } from './Presenter'

export interface CliOption {
  name: string
  version: string
  commands: CliCommand[]
}

export interface CliContext {
  cwd: string
  presenterFactory: Partial<PresenterFactory>
}

const args = yargs(process.argv)
// istanbul ignore next
if (args['debug-cli']) {
  addAppender(new ColorAppender())
  log.setLevel(logLevel.debug)
}

function overridePresenterFactory(context): PresenterFactory {
  const presenterFactory = context.presenterFactory || plainPresenterFactory

  presenterFactory.createCliPresenter = presenterFactory.createCliPresenter || plainPresenterFactory.createCliPresenter
  presenterFactory.createCommandPresenter = presenterFactory.createCommandPresenter || plainPresenterFactory.createCommandPresenter
  delete context.presenterFactory
  return presenterFactory
}

export class Cli<Context extends { [i: string]: any } = {}> {
  cwd: string
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
  commands: CliCommandInstance[] = []
  name: string
  version: string
  private ui: LogPresenter & HelpPresenter & VersionPresenter
  private presenterFactory: PresenterFactory
  private context: Partial<CliContext> & Context
  constructor(option: CliOption, context: Partial<CliContext> & Context = {} as any) {
    this.name = option.name
    this.version = option.version

    const cwd = context.cwd = context.cwd || process.cwd()
    log.debug('cwd', context.cwd)
    context.config = loadConfig(`${this.name}.json`, { cwd })
    log.debug('Loaded config', context.config)

    this.presenterFactory = overridePresenterFactory(context)

    context['parent'] = this
    this.context = context
    this.ui = this.presenterFactory.createCliPresenter({ name: this.name })
    option.commands.forEach(command => {
      this.addCliCommand(command)
    })
  }

  parse(rawArgv: string[]) {
    const args = parseArgv(this, rawArgv.slice(1))
    return this.process(args, rawArgv.slice(1))
  }

  protected addCliCommand(command: CliCommand) {
    this.commands.push(createCliCommand(command, this.presenterFactory, this.context))
  }

  private process(args, rawArgv) {
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

function getCmdChainCount(command) {
  let count = 0
  let p = command
  while (p) {
    p = p.parent
    count++
  }
  return count - 1
}
