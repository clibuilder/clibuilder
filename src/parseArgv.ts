import yargs = require('yargs-parser')

import { Command } from './Command'

export class InvalidOptionError extends Error {
  constructor(public name, public type, public value) {
    super(`Option '${name}' expects ${type} but received ${value}`)
  }
}

export class UnknownOptionError extends Error {
  constructor(public name) {
    super(`Unknown option '${name}'`)
  }
}

export interface Parsable {
  name: string
  arguments?: Command.Argument[]
  commands?: Parsable[]
  options?: {
    boolean?: Command.BooleanOptions
    string?: Command.StringOptions,
    number?: Command.NumberOption
  }
}

export function parseArgv(parsable: Parsable, rawArgv: string[]) {
  const options = toYargsOption(parsable.options)

  const args = yargs(rawArgv, options)
  args._.shift()
  if (parsable.commands) {
    return args
  }

  validateArguments(parsable, args)
  validateOptions(parsable, args)
  handleGroupedOptions(parsable, args, rawArgv)

  return args
}

function toYargsOption(options) {
  if (!options) {
    return {}
  }
  const result: any = { alias: {}, default: {} }
  fillOptions('boolean')
  fillOptions('string')
  fillOptions('number')

  return result

  function fillOptions(typeName) {
    if (options[typeName]) {
      const values = options[typeName]
      result[typeName] = Object.keys(values)
      result[typeName].forEach(k => {
        const v = values[k]
        if (v.alias) {
          result.alias[k] = v.alias
        }
        if (v.default) {
          result.default[k] = v.default
        }
      })
    }
  }
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
    return groups
  }
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
            if (args[n] === true) {
              args[n] = false
            }
            else if (args[n]) {
              delete args[n]
            }
          })
        }
      })
    }
  })
}

function findOptionNameAndAlias({ options }: Pick<Parsable, 'options'>, name: string) {
  const result = [name]
  const o = (options!.boolean && options!.boolean![name]) || (options!.string && options!.string![name])
  if (o && o.alias) {
    result.push(...o.alias)
  }
  return result
}
