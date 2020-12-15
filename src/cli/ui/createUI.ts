import padRight from 'pad-right'
import { getLogger, Logger, logLevels } from 'standard-log'
import wordwrap from 'wordwrap'
import { CommandModel } from '../../presenter'

const INDENT = 2
const RIGHT_PADDING = 2
const MIN_LHS_WIDTH = 25
const wrap = wordwrap(80)

export function createUI(log: Logger = getLogger('clibuilder')) {
  log.level = logLevels.info
  return {
    get displayLevel() {
      if (log.level! <= logLevels.none) return 'none'

      if (log.level! <= logLevels.info) return 'info'
      return 'debug'
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
      }
    },
    debug: (...args: any[]) => log.debug(...args),
    info: (...args: any[]) => log.info(...args),
    warn: (...args: any[]) => log.warn(...args),
    error: (...args: any[]) => log.error(...args),
    showHelp: (cliName: string, command: CommandModel) => {
      const msg = generateHelpMessage(cliName, command)
      log.info(msg)
    },
    showVersion(version?: string) {
      log.info(version || 'not versioned')
    }
  }
}
function generateHelpMessage(cliName: string, command: CommandModel) {
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

function generateUsageSection(cliName: string, command: CommandModel) {
  const nameChain = getCommandNameChain(cliName, command)
  let message = `Usage: ${nameChain.join(' ')}${command.commands ? ' <command>' : ''}`
  if (command.arguments) message += ' [arguments]'
  if (command.options) message += ' [options]'
  return message
}

function generateDescriptionSection(command: CommandModel) {
  return command.description ? '  ' + command.description : ''
}

function getCommandNameChain(cliName: string, command: CommandModel) {
  const commands = [command]
  while (command.parent) {
    commands.unshift(command.parent)
    command = command.parent
  }
  return [cliName, ...commands.map(c => c.name).filter(x => x)]
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
      if (c.alias) {
        result.push(`${c.name} (${c.alias.join('|')})`)
      }
      else result.push(c.name)
    })
  }
  return result
}

function generateArgumentsSection(command: CommandModel) {
  if (!command.arguments) {
    return ''
  }

  let message = 'Arguments:\n'
  const entries: string[][] = []
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
  const entries: string[][] = []
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

function formatKeyValue(key: string, value: any) {
  const values = value.alias ? [...value.alias, key].sort((a, b) => a.length - b.length) : [key]
  return `[${values.map(v => v.length === 1 ? '-' + v : '--' + v).join('|')}]`
}

function generateAliasSection(command: CommandModel) {
  if (!command.alias)
    return ''
  return `Alias:
  ${wrap(command.alias.join(', '))}`
}
