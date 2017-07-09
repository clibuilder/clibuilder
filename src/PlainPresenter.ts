import padRight = require('pad-right')
import wordwrap = require('wordwrap')

import { Display, ConsoleDisplay, DisplayLevel } from './Display'
import { LogPresenter, HelpPresenter, VersionPresenter, PresenterOption, CommandModel } from './Presenter'

const INDENT = 2
const RIGHT_PADDING = 2
const MIN_LHS_WIDTH = 25
const wrap = wordwrap(80)


export class PlainPresenter implements LogPresenter, HelpPresenter, VersionPresenter {
  display: Display = new ConsoleDisplay()
  name: string
  displayLevel: DisplayLevel = DisplayLevel.Normal
  constructor(options: PresenterOption) {
    this.name = options.name
  }

  showVersion(version) {
    this.display.info(version)
  }

  showHelp(command: CommandModel) {
    const msg = generateHelpMessage(command)
    this.display.info(msg)
  }
  setDisplayLevel(displayLevel: DisplayLevel) {
    this.displayLevel = displayLevel
  }
  info(...args: any[]) {
    if (this.displayLevel >= DisplayLevel.Normal)
      this.display.info(...args)
  }
  warn(...args: any[]) {
    if (this.displayLevel >= DisplayLevel.Normal)
      this.display.warn(...args)
  }
  error(...args: any[]) {
    if (this.displayLevel >= DisplayLevel.Normal)
      this.display.error(...args)
  }
  debug(...args: any[]) {
    if (this.displayLevel >= DisplayLevel.Verbose)
      this.display.debug(...args)
  }
}

function generateHelpMessage(command: CommandModel) {
  const helpSections = [
    generateUsageSection(command),
    generateDescriptionSection(command),
    generateCommandsSection(command),
    generateArgumentsSection(command),
    generateOptionsSection(command),
    generateAliasSection(command)
  ].filter(m => !!m)
  return `
${helpSections.join('\n\n')}
`
}

function generateUsageSection(command: CommandModel) {
  const nameChain = getCommandNameChain(command)
  return `Usage: ${nameChain.join(' ')}${command.commands ? ' <command>' : ''}`
}

function generateDescriptionSection(command: CommandModel) {
  return command.description ? '  ' + command.description : ''
}

function getCommandNameChain(command: CommandModel) {
  const commands = [command]
  while (command.parent) {
    commands.unshift(command.parent)
    command = command.parent
  }
  return commands.map(c => c.name)
}

function generateCommandsSection(command: CommandModel) {
  const commandNames = getCommandsNamesAndAlias(command.commands)
  if (commandNames.length === 0)
    return ''

  return `Commands:
  ${wrap(commandNames.join(', '))}

${padRight(command.name + ' <command> -h', MIN_LHS_WIDTH, ' ')}Get help for <command>`
}

function getCommandsNamesAndAlias(commands: CommandModel[] | undefined) {
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

function generateArgumentsSection(command: CommandModel) {
  if (!command.arguments) {
    return ''
  }

  let message = 'Arguments:\n'
  let entries: string[][] = []
  let maxWidth = 0
  command.arguments.forEach(a => {
    const argStr = a.required ? `<${a.name}>` : `[${a.name}]`
    maxWidth = Math.max(maxWidth, argStr.length)
    entries.push([argStr, a.description || ''])
  })

  const alignedWidth = Math.max(MIN_LHS_WIDTH - INDENT, maxWidth + RIGHT_PADDING)

  if (entries.length > 0) {
    message += entries.map(e => `  ${padRight(e[0], alignedWidth, ' ')}${e[1]}`).join('\n')
  }
  return message
}

function generateOptionsSection(command: CommandModel) {
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
      const description = value.default ? `${value.description} (default '${value.default}')` : value.description
      entries.push([optionStr, description])
    }
  }
  if (command.options.boolean) {
    for (const key in command.options.boolean) {
      const value = command.options.boolean[key]
      const optionStr = `${formatKeyValue(key, value)}`
      maxOptionStrWidth = Math.max(maxOptionStrWidth, optionStr.length)
      const description = value.default ? `${value.description} (default true)` : value.description
      entries.push([optionStr, description])
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

function generateAliasSection(command: CommandModel) {
  if (!command.alias)
    return ''
  return `Alias:
  ${wrap(command.alias.join(', '))}`
}
