import { logLevel } from '@unional/logging'
import yargs = require('yargs-parser')

import { Command } from './Command'
import { DisplayLevel } from './Display'
import { parseArgv } from './parseArgv'
import { LogPresenter, HelpPresenter, VersionPresenter } from './Presenter'
import { PresenterFactory } from './PresenterFactory'
import { createCommand, getCommand } from './util'
import { log } from './log'
import { loadConfig } from './loadConfig'

export interface CliOption {
  name: string
  version: string
  commands: Command[]
}

export interface CliContext {
  cwd: string
  presenterFactory: PresenterFactory
}

const args = yargs(process.argv)
// istanbul ignore next
if (args['debug-cli']) {
  log.setLevel(logLevel.debug)
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
  commands: Command.Instance[]
  name: string
  version: string
  private ui: LogPresenter & HelpPresenter & VersionPresenter
  constructor(option: CliOption, context: Partial<CliContext> & Context = {} as any) {
    this.name = option.name
    this.version = option.version

    context.cwd = context.cwd || process.cwd()
    log.debug('cwd', context.cwd)
    context.config = loadConfig(`${this.name}.json`, context.cwd)
    log.debug('Loaded config', context.config)

    const presenterFactory = context.presenterFactory || new PresenterFactory()
    delete context.presenterFactory
    context['parent'] = this

    this.ui = presenterFactory.createCliPresenter(this)
    this.commands = option.commands.map(s => {
      return createCommand(s, presenterFactory, context)
    })
  }

  parse(rawArgv: string[]) {
    const args = parseArgv(this, rawArgv.slice(1))
    return this.process(args, rawArgv.slice(1))
  }

  private process(args, rawArgv) {
    if (args.version) {
      this.ui.showVersion(this.version)
      return Promise.resolve()
    }
    const command = getCommand(args._, this.commands)
    const cmdChainCount = getCmdChainCount(command)
    if (!command) {
      this.ui.showHelp(this)
      return Promise.resolve()
    }

    if (args.help) {
      command.ui.showHelp(command)
      return Promise.resolve()
    }

    const cmdArgv = rawArgv.slice(cmdChainCount).filter(x => ['--verbose', '-V', '--silent'].indexOf(x) === -1)

    let cmdArgs
    try {
      cmdArgs = parseArgv(command, cmdArgv)
    }
    catch (e) {
      command.ui.error(e.message)
      command.ui.showHelp(command)
      return Promise.resolve()
    }

    const displayLevel = args.verbose ?
      DisplayLevel.Verbose : args.silent ?
        DisplayLevel.Silent : DisplayLevel.Normal
    command.ui.setDisplayLevel(displayLevel)
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
