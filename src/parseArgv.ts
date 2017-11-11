import yargs = require('yargs-parser')

import { Parsable } from './interfaces'
import { toYargsOption } from './toYargsOption'

export class InvalidOptionError extends Error {
  constructor(public name, public type, public value) {
    super(`Option '${name}' expects ${type} but received ${value}`)
    Object.setPrototypeOf(this, InvalidOptionError.prototype)
  }
}

export class UnknownOptionError extends Error {
  constructor(public name) {
    super(`Unknown option '${name}'`)
    Object.setPrototypeOf(this, UnknownOptionError.prototype)
  }
}

export function parseArgv(parsable: Parsable, rawArgv: string[]) {
  const options = toYargsOption(parsable.options)

  const args = yargs(rawArgv, options)
  args._.shift()
  if (parsable.commands) {
    return args
  }
  fixStringOptions(args)
  fixBooleanOptions(args, rawArgv)
  clearAlias(parsable, args)
  validateArguments(parsable, args)
  validateOptions(parsable, args)
  handleGroupedOptions(parsable, args, rawArgv)
  fillDefaults(parsable, args, rawArgv)

  return args
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
      throw new Error('Too many arguments')
    }
    if (args._.length < required) {
      throw new Error('Missing argument(s)')
    }
  }
  else {
    if (args._.length > 0) {
      throw new Error('Too many arguments')
    }
  }
}

function validateOptions(command, args) {
  let map = {
    _: true
  }

  if (command.options) {
    map = { ...map, ...extractTypes(command.options.boolean, 'boolean') }
    map = { ...map, ...extractTypes(command.options.string, 'string') }
    map = { ...map, ...extractTypes(command.options.number, 'number') }
  }

  Object.keys(args).forEach(name => {
    if (map[name]) {
      if (map[name] === 'boolean' && typeof args[name] !== 'boolean') {
        throw new InvalidOptionError(name, 'boolean', args[name])
      }
      if (map[name] === 'string' && typeof args[name] !== 'string') {
        throw new InvalidOptionError(name, 'string', args[name])
      }
      if (map[name] === 'number' && typeof args[name] !== 'number') {
        throw new InvalidOptionError(name, 'number', args[name])
      }
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
    result.push(...o.alias)
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
