import * as minimist from 'minimist'
import { CommandSpec } from './Command'

export class ParseError extends Error {
  constructor(public name, public type, public value) {
    super()
  }
}

export function parseArgv(command: CommandSpec, rawArgv: string[]) {
  const options = toMinimistOption(command.options)
  const args = minimist(rawArgv, options)
  args._.shift()
  if (command.commands) {
    return args
  }

  validateArguments(command, args)
  validateOptions(command, args)

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

function validateArguments(command, args) {
  if (command.arguments) {
    const total = command.arguments.length
    const required = command.arguments.reduce((p, a) => {
      return a.required ? p + 1 : p
    }, 0)
    if (args._.length > total || args._.length < required) {
      throw new Error('Argument count mismatch')
    }
  }
  else {
    if (args._.length > 0) {
      throw new Error('Extra arguments')
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

  const errors: any = []
  Object.keys(args).forEach(name => {
    if (map[name]) {
      if (map[name] === 'boolean' && typeof args[name] !== 'boolean') {
        errors.push(new ParseError(name, 'boolean', args[name]))
      }
      if (map[name] === 'string' && typeof args[name] !== 'string') {
        errors.push(new ParseError(name, 'string', args[name]))
      }
    }
    else {
      errors.push(new ParseError(name, 'extra', args[name]))
    }
  })

  if (errors.length !== 0) {
    throw new Error('Extra options')
  }
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
