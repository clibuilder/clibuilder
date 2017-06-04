import { getLogger, addAppender } from 'aurelia-logging'
import wordwrap = require('wordwrap')
import padRight = require('pad-right')
import { Command } from './Command'
import { DisplayAppender } from './DisplayAppender'
import { Display } from './interfaces'

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
    const help = getHelp(command)
    this.display.info(help)
  }
}

function getSubCommandNames(command: Command) {
  const commandNames: string[] = []
  if (command.commands) {
    command.commands.forEach(c => {
      commandNames.push(c.name)
      if (c.alias) {
        commandNames.push(...c.alias)
      }
      if (c.commands) {
        c.commands.forEach(sub => {
          commandNames.push(...getSubCommandNames(sub))
        })
      }
    })
  }
  return commandNames
}

function getHelp(command: Command) {
  const messages = [
    `Usage: ${command.name} <command>`,
    getCommandMessages(command),
    `${command.name} <command> -h      Get help for <command>`,
    getOptionMessages(command),
    getAliasMessages(command)
  ].filter(m => m)
  return '\n' + messages.join('\n\n') + '\n'
}

function getCommandMessages(command: Command) {
  const commandNames = getSubCommandNames(command)
  return `Commands:
  ${commandNames.join(', ')}`
}
function formatKeyValue(key, value) {
  return `[${value.alias ? '-' + value.alias + '|' : ''}--${key}]`
}
function getOptionMessages(command: Command) {
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

  // pad 4 space if there are enough space, otherwise only 2
  const INDENT = 2
  const RIGHT_PADDING = 2
  const MIN_OPTION_STR_WIDTH = 25
  const alignedWidth = Math.max(MIN_OPTION_STR_WIDTH - INDENT, maxOptionStrWidth + RIGHT_PADDING)

  if (entries.length > 0) {
    message += entries.map(e => `  ${padRight(e[0], alignedWidth, ' ')}${e[1]}`).join('\n')
  }
  return message
}

function getAliasMessages(command: Command) {
  if (!command.alias)
    return ''
  return `Alias:
  ${wrap(command.alias.join(', '))}`
}
