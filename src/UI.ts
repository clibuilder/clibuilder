import { getLogger, addAppender } from 'aurelia-logging'
import wordwrap = require('wordwrap')
import padRight = require('pad-right')
import { Command } from './Command'
import { DisplayAppender } from './DisplayAppender'
import { Display } from './interfaces'

const INDENT = 2
const RIGHT_PADDING = 2
const MIN_LHS_WIDTH = 25
const wrap = wordwrap(80)
let display: Display

export interface ICommand {
  parent?: ICommand
  name: string
  commands?: ICommand[]
  alias?: string[]
  options?: Command.Options
}

export function createDefaultDisplay(name: string) {
  if (!display) {
    addAppender(new DisplayAppender())
    display = getLogger(name)
  }
  return display
}

export class UI {
  constructor(private display: Display) {
  }

  showHelp(command: ICommand) {
    this.display.info(generateHelpMessage(command))
  }
  info(...args: any[]) {
    this.display.info(...args)
  }
  warn(...args: any[]) {
    this.display.warn(...args)
  }
  error(...args: any[]) {
    this.display.error(...args)
  }
  debug(...args: any[]) {
    this.display.debug(...args)
  }
}

function generateHelpMessage(command: ICommand) {
  const helpSections = [
    generateUsageSection(command),
    generateCommandsSection(command),
    generateArgumentsSection(command),
    generateOptionsSection(command),
    generateAliasSection(command)
  ].filter(m => !!m)
  return `
${helpSections.join('\n\n')}
`
}

function generateUsageSection(command: ICommand) {
  const nameChain = getCommandNameChain(command)
  return `Usage: ${nameChain.join(' ')} <command>`
}

function getCommandNameChain(command: ICommand) {
  const commands = [command]
  while (command.parent) {
    commands.unshift(command.parent)
    command = command.parent
  }
  return commands.map(c => c.name)
}

function generateCommandsSection(command: ICommand) {
  const commandNames = getCommandsNamesAndAlias(command.commands)
  if (commandNames.length === 0)
    return ''

  return `Commands:
  ${wrap(commandNames.join(', '))}

${padRight(command.name + ' <command> -h', MIN_LHS_WIDTH, ' ')}Get help for <command>`
}

function getCommandsNamesAndAlias(commands: ICommand[] | undefined) {
  const result: string[] = []
  if (commands) {
    commands.forEach(c => {
      result.push(c.name)
      if (c.alias) {
        result.push(...c.alias)
      }

      result.push(...getCommandsNamesAndAlias(c.commands))
    })
  }
  return result
}

function generateArgumentsSection(_command: ICommand) {
  return ''
}

function generateOptionsSection(command: ICommand) {
  if (!command.options) {
    return ''
  }
  let message = 'Options:\n'
  let entries: string[][] = []
  let maxOptionStrWidth = 0
  if (command.options.string) {
    for (const key in command.options.string) {
      const value = command.options.string[key]
      const optionStr = `${formatKeyValue(key, value)}=value`
      maxOptionStrWidth = Math.max(maxOptionStrWidth, optionStr.length)
      entries.push([optionStr, value.description])
    }
  }
  if (command.options.boolean) {
    for (const key in command.options.boolean) {
      const value = command.options.boolean[key]
      const optionStr = `${formatKeyValue(key, value)}`
      maxOptionStrWidth = Math.max(maxOptionStrWidth, optionStr.length)
      entries.push([optionStr, value.description])
    }
  }

  const alignedWidth = Math.max(MIN_LHS_WIDTH - INDENT, maxOptionStrWidth + RIGHT_PADDING)

  if (entries.length > 0) {
    message += entries.map(e => `  ${padRight(e[0], alignedWidth, ' ')}${e[1]}`).join('\n')
  }
  return message
}

function formatKeyValue(key, value) {
  return `[${value.alias ? '-' + value.alias + '|' : ''}--${key}]`
}

function generateAliasSection(command: ICommand) {
  if (!command.alias)
    return ''
  return `Alias:
  ${wrap(command.alias.join(', '))}`
}
