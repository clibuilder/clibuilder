import * as minimist from 'minimist'

import { BooleanOptions, StringOptions, Argument } from './Command'

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

export interface Parseable {
  arguments?: Argument[]
  commands?: Parseable[]
  options?: {
    boolean?: BooleanOptions
    string?: StringOptions
    group?: { [name: string]: string[] }
  }
}

export function parseArgv(command: Parseable, rawArgv: string[]) {
  const options = toMinimistOption(command.options)
  const args = minimist(rawArgv, options)
  args._.shift()
  if (command.commands) {
    return args
  }

  validateArguments(command, args)
  validateOptions(command, args)
  handleGroupedOptions(command, args, rawArgv)

  return args
}

function toMinimistOption(options) {
  if (!options) {
    return {}
  }
  const result: any = { alias: {}, default: {} }
  fillOptions('boolean')
  fillOptions('string')

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

function validateArguments(command: Parseable, args) {
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
  }

  Object.keys(args).forEach(name => {
    if (map[name]) {
      if (map[name] === 'boolean' && typeof args[name] !== 'boolean') {
        throw new InvalidOptionError(name, 'boolean', args[name])
      }
      if (map[name] === 'string' && typeof args[name] !== 'string') {
        throw new InvalidOptionError(name, 'string', args[name])
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

function handleGroupedOptions(parsable: Parseable, args: minimist.ParsedArgs, rawArgv: string[]) {
  const noDefaults = minimist(rawArgv)
  if (!(parsable.options && parsable.options.group))
    return

  const keys = Object.keys(parsable.options.group)
  keys.forEach(k => {
    const group = parsable.options!.group![k]
    const usedOptions = group.filter(g => {
      const namesAndAlias = findOptionNameAndAlias(parsable, g)
      return namesAndAlias.find(n => noDefaults[n])
    })

    if (usedOptions.length > 0) {
      group.forEach(g => {
        // console.log(g, usedOptions, usedOptions.indexOf(g))
        if (usedOptions.indexOf(g) === -1) {
          // console.log(g)
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

function findOptionNameAndAlias({ options }: Pick<Parseable, 'options'>, name: string) {
  const result = [name]
  const o = (options!.boolean && options!.boolean![name]) || (options!.string && options!.string![name])
  if (o && o.alias) {
    result.push(...o.alias)
  }
  return result
}
