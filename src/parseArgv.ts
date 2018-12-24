import camelCase from 'camel-case';
import yargs from 'yargs-parser';
import { Parsable } from './interfaces';
import { toYargsOption } from './toYargsOption';

export class NotNumberOption extends Error {
  // istanbul ignore next
  constructor(public name) {
    super(`Option '${name}' only accepts number`)
    Object.setPrototypeOf(this, NotNumberOption.prototype)
  }
}

export class UnknownOptionError extends Error {
  // istanbul ignore next
  constructor(public name) {
    super(`Unknown option '${name}'`)
    Object.setPrototypeOf(this, UnknownOptionError.prototype)
  }
}

export class MissingArguments extends Error {
  // istanbul ignore next
  constructor(public expected: number, public actual: number) {
    super((expected <= 1 ? `Missing Argument.` : `Missing Arguments.`) + ` Expecting ${expected} but received ${actual}.`)
    Object.setPrototypeOf(this, MissingArguments.prototype)
  }
}

export class TooManyArguments extends Error {
  // istanbul ignore next
  constructor(public expected: number, public actual: number) {
    super(`Too Many Arguments. Expecting ${expected} but received ${actual}.`)
    Object.setPrototypeOf(this, TooManyArguments.prototype)
  }
}

export function parseArgv(parsable: Parsable, rawArgv: string[]) {
  const options = toYargsOption(parsable.options)

  const args = yargs(rawArgv, options)
  args._.shift()
  fixStringOptions(args)
  fixBooleanOptions(args, rawArgv)
  clearAlias(parsable, args)

  if (parsable.commands) {
    fillArguments(parsable, args)
    return args
  }

  validateArguments(parsable, args)
  validateOptions(parsable, args)
  handleGroupedOptions(parsable, args, rawArgv)
  fillDefaults(parsable, args, rawArgv)
  fillArguments(parsable, args)

  return args
}

function fillArguments(parsable: Parsable, args) {
  if (!parsable.arguments)
    return
  parsable.arguments.forEach(a => {
    if (args._.length <= 0)
      return
    if (a.multiple) {
      args[a.name] = args._.splice(0, args._.length)
    }
    else {
      args[a.name] = args._.shift()
    }
    args[camelCase(a.name)] = args[a.name]
  })
}

function fixStringOptions(args) {
  Object.keys(args).forEach(k => {
    if (typeof args[k] === 'string') {
      args[k] = args[k].trim()
    }
  })
}

/**
 * `yargs-parser` will fill in `false` on boolean even if the option does not have default set.
 * This will fix that issue by deleting the values and alias.
 */
function fixBooleanOptions(args, argv) {
  const inputArgs = yargs(argv)
  Object.keys(args).forEach(k => {
    if (args[k] === false && inputArgs[k] === undefined)
      delete args[k]
  })
}

function clearAlias(parsable: Parsable, args) {
  if (!parsable.options)
    return
  const alias: string[] = []
  alias.push(...getAlias(parsable.options.boolean))
  alias.push(...getAlias(parsable.options.string))
  alias.push(...getAlias(parsable.options.number))
  Object.keys(args).forEach(k => {
    if (alias.indexOf(k) !== -1)
      delete args[k]
  })
}

function getAlias(options) {
  if (!options)
    return []
  return Object.keys(options).filter(k => options[k].alias).reduce((p, k) => p.concat(options[k].alias), [])
}

function validateArguments(command: Parsable, args) {
  if (command.arguments) {
    const total = command.arguments.length
    let required = 0
    let multiple = false
    command.arguments.forEach(a => {
      if (a.required)
        required++
      if (a.multiple)
        multiple = true
    })

    if (args._.length > total && !multiple) {
      throw new TooManyArguments(total, args._.length)
    }
    if (args._.length < required) {
      throw new MissingArguments(required, args._.length)
    }
  }
  else {
    if (args._.length > 0) {
      throw new TooManyArguments(0, args._.length)
    }
  }
}

function validateOptions(command, args) {
  let map = {}

  if (command.options) {
    map = { ...map, ...extractTypes(command.options.boolean, 'boolean') }
    map = { ...map, ...extractTypes(command.options.string, 'string') }
    map = { ...map, ...extractTypes(command.options.number, 'number') }
  }

  Object.keys(args).forEach(name => {
    if (name === '_')
      return
    const optionType = map[name]
    if (optionType) {
      const arg = args[name]
      if (Number.isNaN(arg))
        throw new NotNumberOption(name)
    }
    else {
      throw new UnknownOptionError(name)
    }
  })
}

function extractTypes(sourceMap, valueType) {
  const map = {}
  if (sourceMap) {
    Object.keys(sourceMap).forEach(k => {
      map[k] = valueType
      const v = sourceMap[k]
      if (v.alias) {
        v.alias.forEach(k => {
          map[k] = valueType
        })
      }
    })
  }
  return map
}

function handleGroupedOptions(parsable: Parsable, args: yargs.ParsedArgs, rawArgv: string[]) {
  if (!parsable.options)
    return

  const noDefaults = yargs(rawArgv)
  const groups = getAllGroups(parsable.options)
  const keys = Object.keys(groups)
  keys.forEach(k => {
    const group = groups[k]
    const usedOptions = group.filter(g => {
      const namesAndAlias = findOptionNameAndAlias(parsable, g)
      return namesAndAlias.find(n => noDefaults[n])
    })

    if (usedOptions.length > 0) {
      group.forEach(g => {
        if (usedOptions.indexOf(g) === -1) {
          const namesAndAlias = findOptionNameAndAlias(parsable, g)
          namesAndAlias.forEach(n => {
            delete args[n]
          })
        }
      })
    }
  })
}

function getAllGroups(opts) {
  const groups = {}
  if (opts.boolean) {
    for (let key in opts.boolean) {
      if (opts.boolean[key].group) {
        const id = opts.boolean[key].group
        if (groups[id])
          groups[id].push(key)
        else
          groups[id] = [key]
      }
    }
  }
  if (opts.string) {
    for (let key in opts.string) {
      if (opts.string[key].group) {
        const id = opts.string[key].group
        if (groups[id])
          groups[id].push(key)
        else
          groups[id] = [key]
      }
    }
  }
  if (opts.number) {
    for (let key in opts.number) {
      if (opts.number[key].group) {
        const id = opts.number[key].group
        if (groups[id])
          groups[id].push(key)
        else
          groups[id] = [key]
      }
    }
  }
  return groups
}

function findOptionNameAndAlias({ options }: Pick<Parsable, 'options'>, name: string) {
  const result = [name]
  const o = (options!.boolean && options!.boolean![name]) || (options!.string && options!.string![name]) ||
    (options!.number && options!.number![name])
  if (o && o.alias) {
    o.alias.forEach(a => {
      result.push(a)
    })
  }
  return result
}

function fillDefaults(parsable: Parsable, args, argv) {
  if (!parsable.options) {
    args._defaults = []
    return
  }

  const optionsWithDefault: string[] = []
  const optionGroups = {}
  fillOptionsWithDefaults(parsable.options.boolean, optionsWithDefault, optionGroups)
  fillOptionsWithDefaults(parsable.options.string, optionsWithDefault, optionGroups)
  fillOptionsWithDefaults(parsable.options.number, optionsWithDefault, optionGroups)
  function fillOptionsWithDefaults(options, optionsWithDefault, optionGroups) {
    if (options) {
      Object.keys(options).forEach(o => {
        const option = options[o]
        if (option.default !== undefined)
          optionsWithDefault.push(o)
        if (option.group !== undefined) {
          optionGroups[option.group] = optionGroups[option.group] || []
          optionGroups[option.group].push(o)
          if (option.alias)
            optionGroups[option.group] = optionGroups[option.group].concat(option.alias)
        }
      })
    }
  }

  const inputKeys = Object.keys(yargs(argv))
  const groupKeys = Object.keys(optionGroups)
  args._defaults = optionsWithDefault.filter(o => {
    return inputKeys.indexOf(o) === -1
  })
  groupKeys.forEach(k => {
    const g: string[] = optionGroups[k]
    if (g.some(k => inputKeys.indexOf(k) !== -1)) {
      args._defaults = args._defaults.filter(d => g.indexOf(d) === -1)
    }
  })
}
