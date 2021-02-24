import padRight from 'pad-right'
import { getLogger, Logger, logLevels } from 'standard-log'
import { someKey } from 'type-plus'
import wordwrap from 'wordwrap'
import * as z from 'zod'
import type { cli } from './cli'

const INDENT = 2
const RIGHT_PADDING = 2
const MIN_LHS_WIDTH = 25
const wrap = wordwrap(80)

export function ui(log: Logger = getLogger('clibuilder')) {
  log.level = logLevels.info
  return {
    get displayLevel() {
      if (log.level! <= logLevels.none) return 'none'

      if (log.level! <= logLevels.info) return 'info'

      if (log.level! <= logLevels.debug) return 'debug'
      return 'trace'
    },
    set displayLevel(level) {
      switch (level) {
        case 'none':
          log.level = logLevels.none
          break
        case 'info':
        default:
          log.level = logLevels.info
          break
        case 'debug':
          log.level = logLevels.debug
          break
        case 'trace':
          log.level = logLevels.trace
          break
      }
    },
    trace: (...args: any[]) => log.trace(...args),
    debug: (...args: any[]) => log.debug(...args),
    info: (...args: any[]) => log.info(...args),
    warn: (...args: any[]) => log.warn(...args),
    error: (...args: any[]) => log.error(...args),
    showHelp: (cliName: string, command: ui.Command) => {
      const msg = generateHelpMessage(cliName, command)
      log.info(msg)
    },
    showVersion(version?: string) {
      log.info(version || 'not versioned')
    }
  }
}

export namespace ui {
  export type Command = cli.Command & {
    parent?: cli.Command
  }
}
function generateHelpMessage(cliName: string, command: ui.Command) {
  const helpSections = [
    generateUsageSection(cliName, command),
    generateDescriptionSection(command),
    generateCommandsSection(command),
    generateArgumentsSection(command),
    generateOptionsSection(command),
    generateAliasSection(command),
  ].filter(m => !!m)
  return `
${helpSections.join('\n\n')}
`
}

function generateUsageSection(cliName: string, command: ui.Command) {
  const nameChain = getCommandNameChain(cliName, command)
  let message = `Usage: ${nameChain.join(' ')}${command.commands ? ' <command>' : ''}`
  if (command.arguments) {
    message += command.arguments.some(a => isRequired(a, true)) ? ' <arguments>' : ' [arguments]'
  }
  if (command.options) {
    message += someKey(command.options, (k) => isRequired(command.options![k], false))
      ? ' <options>'
      : ' [options]'
  }
  return message
}

function isRequired({ type }: { type?: z.ZodType<any> }, defaultValue: boolean) {
  if (!type) return defaultValue
  return !type.isOptional()
}

function generateDescriptionSection(command: ui.Command) {
  return command.description ? '  ' + command.description : ''
}

function getCommandNameChain(cliName: string, command: ui.Command) {
  const commands = [command]
  while (command.parent) {
    commands.unshift(command.parent)
    command = command.parent
  }
  return [cliName, ...commands.map(c => c.name).filter(x => x)]
}

function generateCommandsSection(command: ui.Command) {
  const commandNames = getCommandsNamesAndAlias(command.commands)
  if (commandNames.length === 0)
    return ''

  return `Commands:
  ${wrap(commandNames.join(', '))}

${padRight(command.name + ' <command> -h', MIN_LHS_WIDTH, ' ')}Get help for <command>`
}

function getCommandsNamesAndAlias(commands: cli.Command[] | undefined) {
  const result: string[] = []
  if (commands) {
    commands.forEach(c => {
      if (c.alias) {
        result.push(`${c.name} (${c.alias.join('|')})`)
      }
      else result.push(c.name)
    })
  }
  return result
}

function generateArgumentsSection(command: ui.Command) {
  if (!command.arguments) {
    return ''
  }

  let message = 'Arguments:\n'
  const entries: string[][] = []
  let maxWidth = 0
  command.arguments.forEach(a => {
    const argStr = !a.type?.isOptional ? `<${a.name}>` : `[${a.name}]`
    maxWidth = Math.max(maxWidth, argStr.length)
    entries.push([argStr, a.description || ''])
  })

  const alignedWidth = Math.max(MIN_LHS_WIDTH - INDENT, maxWidth + RIGHT_PADDING)

  if (entries.length > 0) {
    message += entries.map(e => `  ${padRight(e[0], alignedWidth, ' ')}${e[1]}`).join('\n')
  }
  return message
}

function generateOptionsSection(command: ui.Command) {
  if (!command.options) {
    return ''
  }
  let message = 'Options:\n'
  const entries: string[][] = []
  let maxOptionStrWidth = 0
  if (command.options) {
    for (const key in command.options) {
      const value = command.options[key]
      const optionStr = formatKeyValue(key, value)
      const description = formatDescription(value)
      entries.push([optionStr, description])
      maxOptionStrWidth = Math.max(maxOptionStrWidth, optionStr.length)
    }
  }
  // if (command.options.boolean) {
  //   for (const key in command.options.boolean) {
  //     const value = command.options.boolean[key]
  //     const optionStr = `${formatKeyValue(key, value)}`
  //     maxOptionStrWidth = Math.max(maxOptionStrWidth, optionStr.length)
  //     const description = value.default ? `${value.description} (default true)` : value.description
  //     entries.push([optionStr, description])
  //   }
  // }

  const alignedWidth = Math.max(MIN_LHS_WIDTH - INDENT, maxOptionStrWidth + RIGHT_PADDING)

  if (entries.length > 0) {
    message += entries.map(e => `  ${padRight(e[0], alignedWidth, ' ')}${e[1]}`).join('\n')
  }
  return message
}

function formatKeyValue(key: string, value: cli.Command.Options.Entry) {
  const alias = value.alias
    ? value.alias.map(a => typeof a === 'string'
      ? a
      : a.hidden
        ? undefined
        : a.alias)
      .filter(a => a) as string[]
    : []
  const values = [...alias, key].sort((a, b) => a.length - b.length)
  const y = value.type instanceof z.ZodString ? '=value' : ''
  return `[${values.map(v => v.length === 1 ? '-' + v : '--' + v).join('|')}]${y}`
}
function formatDescription(value: cli.Command.Options.Entry) {
  const d = value.type instanceof z.ZodString ? `'${value.default}'` : value.default
  return value.default ? `${value.description} (default '${d}')` : value.description
}
function generateAliasSection(command: ui.Command) {
  if (!command.alias)
    return ''
  return `Alias:
  ${wrap(command.alias.join(', '))}`
}
