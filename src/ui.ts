import padRight from 'pad-right'
import { Logger, logLevels } from 'standard-log'
import { tersify } from 'tersify'
import { reduceByKey, someKey } from 'type-plus'
import wordwrap from 'wordwrap'
import * as z from 'zod'
import type { cli } from './cli'
import { isZodArray, isZodBoolean, isZodNumber, isZodObject, isZodOptional, isZodString } from './zod'

const INDENT = 2
const RIGHT_PADDING = 2
const MIN_LHS_WIDTH = 25
const wrap = wordwrap(80)

export function createBuilderUI(ui: createUI.UI) {
  let pending = true
  const entries: Array<['debug' | 'info' | 'warn' | 'error', any[]]> = []
  // istanbul ignore next
  return {
    ...ui,
    get displayLevel() {
      return ui.displayLevel
    },
    set displayLevel(level) {
      ui.displayLevel = level
    },
    debug: (...args: any[]) => pending ? entries.push(['debug', args]) : ui.debug(...args),
    info: (...args: any[]) => pending ? entries.push(['info', args]) : ui.info(...args),
    warn: (...args: any[]) => pending ? entries.push(['warn', args]) : ui.warn(...args),
    error: (...args: any[]) => pending ? entries.push(['error', args]) : ui.error(...args),
    dump: () => {
      pending = false
      entries.forEach(([m, args]) => ui[m](...args))
    }
  }
}

export function createUI(log: Logger) {
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
        case 'debug':
          log.level = logLevels.debug
          break
        case 'trace':
          log.level = logLevels.trace
          break
      }
    },
    debug: (...args: any[]) => log.debug(...args),
    info: (...args: any[]) => log.info(...args),
    warn: (...args: any[]) => log.warn(...args),
    error: (...args: any[]) => log.error(...args),
    showHelp: (cliName: string, command: createUI.Command) => {
      const msg = generateHelpMessage(cliName, command)
      log.info(msg)
    },
    showVersion(version?: string) {
      log.info(version || 'not versioned')
    }
  }
}

export namespace createUI {
  export type Command = cli.Command & {
    parent?: cli.Command
  }
  export type UI = ReturnType<typeof createUI>
}
function generateHelpMessage(cliName: string, command: createUI.Command) {
  const helpSections = [
    generateUsageSection(cliName, command),
    generateDescriptionSection(command),
    generateCommandsSection(command),
    generateArgumentsSection(command),
    generateOptionsSection(command),
    generateAliasSection(command),
    generateConfigSection(command)
  ].filter(m => !!m)
  return `
${helpSections.join('\n\n')}
`
}

function generateUsageSection(cliName: string, command: createUI.Command) {
  const nameChain = getCommandNameChain(cliName, command)
  const hasCommand = command.commands && command.commands.length > 0
  let message = `Usage: ${nameChain.join(' ')}${hasCommand ? ' <command>' : ''}`
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

function generateDescriptionSection(command: createUI.Command) {
  return command.description ? '  ' + command.description : ''
}

function getCommandNameChain(cliName: string, command: createUI.Command) {
  const commands = [command]
  while (command.parent) {
    commands.unshift(command.parent)
    command = command.parent
  }
  return [cliName, ...commands.map(c => c.name).filter(x => x)]
}

function generateCommandsSection(command: createUI.Command) {
  const commandNames = getCommandsNamesAndAlias(command.commands)
  if (commandNames.length === 0)
    return ''

  return `Commands:
  ${wrap(commandNames.join(', '))}

${padRight(command.name ? command.name + ' <command> -h' : '  <command> -h', MIN_LHS_WIDTH, ' ')}Get help for <command>`
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

function generateArgumentsSection(command: createUI.Command) {
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

  message += entries.map(e => `  ${padRight(e[0], alignedWidth, ' ')}${e[1]}`.trimEnd())
    .join('\n')
  return message
}

function generateOptionsSection(command: createUI.Command) {
  if (!command.options) return ''

  let message = 'Options:\n'
  const entries: string[][] = []
  let maxOptionStrWidth = 0
  for (const key in command.options) {
    const value = command.options[key]
    const optionStr = formatKeyValue(key, value)
    const description = formatDescription(value)
    entries.push([optionStr, description])
    maxOptionStrWidth = Math.max(maxOptionStrWidth, optionStr.length)
  }
  const alignedWidth = Math.max(MIN_LHS_WIDTH - INDENT, maxOptionStrWidth + RIGHT_PADDING)

  message += entries.map(e => `  ${padRight(e[0], alignedWidth, ' ')}${e[1]}`).join('\n')
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
  const keyString = [...alias, key].sort((a, b) => a.length - b.length)
    .map(v => v.length === 1 ? '-' + v : '--' + v).join('|')
  return formatOptionSignature(value.type, keyString)
}

function formatOptionSignature(zodType: z.ZodTypeAny | undefined, keys: string) {
  if (!zodType) return `[${keys}]`
  const optional = isZodOptional(zodType)
  const t = optional ? zodType._def.innerType : zodType
  const isArray = isZodArray(t)
  const at = isArray ? t.element : t
  const valueType = isZodString(at)
    ? isArray ? '=string...' : '=string'
    : isZodNumber(at)
      ? isArray ? '=number...' : '=number'
      : isArray ? '=boolean...' : ''

  return optional
    ? `[${keys}]${valueType}`
    : `<${keys}>${valueType}`
}

function formatDescription(value: cli.Command.Options.Entry) {
  const d = value.type && isZodString(value.type) ? `'${value.default}'` : value.default
  return value.default ? `${value.description} (default ${d})` : value.description
}
function generateAliasSection(command: createUI.Command) {
  if (!command.alias) return ''
  return `Alias:
  ${wrap(command.alias.join(', '))}`
}

function generateConfigSection(command: createUI.Command) {
  if (!command.config) return ''
  return `Config:
${toPrettyType(command.config)}`
}

function toPrettyType(t: z.ZodAny): string {
  return tersify(toTypeObject(t), { maxLength: Infinity }).replace(/'/g, '')
}
function toTypeObject(t: z.ZodAny): any {
  if (isZodObject(t)) {
    const shape = t._def.shape() as Record<string, any>
    return reduceByKey(shape, (p, k) => {
      const t = shape[k]
      if (isZodOptional(t)) p[`${k}?`] = toTypeObject(t._def.innerType)
      else p[k] = toTypeObject(t)
      return p
    }, {} as Record<string, any>)
  }
  if (isZodString(t)) return 'string'
  if (isZodBoolean(t)) return 'boolean'
  if (isZodNumber(t)) return 'number'
  if (isZodArray(t)) {
    if (isZodObject(t.element)) return `Array<${toPrettyType(t.element)}>`
    return `${toPrettyType(t.element)}[]`
  }
  return ''
}
