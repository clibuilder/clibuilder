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

  showHelp(command: Command) {
    this.display.info(generateHelpMessage(command))
  }
}

function generateHelpMessage(command: Command) {
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

function generateUsageSection(command: Command) {
  const nameChain = getCommandNameChain(command)
  return `Usage: ${nameChain.join(' ')} <command>`
}

function getCommandNameChain(command: Command) {
  const commands = [command]
  while (command.parent) {
    commands.unshift(command.parent)
    command = command.parent
  }
  return commands.map(c => c.name)
}

function generateCommandsSection(command: Command) {
  const commandNames = getCommandsNamesAndAlias(command.commands)
  return `Commands:
  ${wrap(commandNames.join(', '))}

${command.name} <command> -h     Get help for <command>`
}

function getCommandsNamesAndAlias(commands: Command[] | undefined) {
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

function generateArgumentsSection(_command: Command) {
  return ''
}

function generateOptionsSection(command: Command) {
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

function generateAliasSection(command: Command) {
  if (!command.alias)
    return ''
  return `Alias:
  ${wrap(command.alias.join(', '))}`
}
