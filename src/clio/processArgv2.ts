import { reduceByKey } from 'type-plus'
import * as z from 'zod'
import { command } from './command'
import { parseArgv } from './parseArgv'

namespace processArgv {
  export type Error = InvalidKey | InvalidValueType | ExpectSingle |
    ExtraArguments | MissingArgument
  export type InvalidKey = {
    type: 'invalid-key',
    key: string
  }
  export type ExpectSingle = {
    type: 'expect-single',
    key: string,
    keyType: z.ZodType<any>,
    value: any
  }
  export type InvalidValueType = {
    type: 'invalid-value',
    key: string,
    message: string,
    value: any,
  }
  export type ExtraArguments = {
    type: 'extra-arguments',
    values: string[]
  }
  export type MissingArgument = {
    type: 'missing-argument',
    name: string
  }
}

export function processArgv(baseCommand: command.Command, commands: command.Command[], argv: string[]) {
  const rawArgs = parseArgv(argv)
  const result = processCommands(commands, rawArgs)
  if (result &&
    !result?.errors.find(e => e.type === 'invalid-key' && e.key === 'version')
  ) return result

  const { command, args, errors } = processCommand(baseCommand, rawArgs)
  console.log(command, args, errors)
  if (Object.keys(args).length === 1) args.help = true

  return { command, args, errors }
}

function processCommands(commands: command.Command[], rawArgs: parseArgv.Result) {
  for (let i = 0; i < commands.length; i++) {
    const result = processCommand(commands[i], rawArgs)
    if (result.command) return result
  }
  return undefined
}
namespace processCommand {
  export type State = {
    command: command.Command,
    rawArgs: parseArgv.Result,
    errors: processArgv.Error[],
    args: { _: string[] } & Record<string, any>
  }
}
function processCommand(command: command.Command, rawArgs: parseArgv.Result) {
  const state: processCommand.State = { command, rawArgs, args: { _: [] }, errors: [] }
  return fillDefaultOptions(fillInputOptions(fillArguments(state)))
}

function fillArguments(state: processCommand.State) {
  const args = [...state.rawArgs._]
  const argSpecs = state.command.arguments || []
  state.args._ = argSpecs.reduce((p, s) => {
    if (args.length === 0) {
      state.errors.push({ type: 'extra-arguments', values: args })
      return p
    }
    if (s.type instanceof z.ZodArray) {
      const e = s.type.element
      let r = e.safeParse(args[0])
      while (r.success) {
        p._.push(r.data)
        args.pop()
        r = e.safeParse(args[0])
      }
    }
    else {
      p._.push(args.pop()!)
    }
    return p
  }, { _: [] as string[], multiple: false })._
  return state
}
function fillInputOptions(state: processCommand.State) {
  return reduceByKey(state.rawArgs, (s, key) => {
    if (key === '_') return s
    if (/^-/.test(key)) {
      // This is the case when user pass in with more then 3 dashes (`---abc`).
      s.errors.push({ type: 'invalid-key', key })
      return s
    }

    const [name, optionEntry] = lookupOptions(state.command, key)
    if (!name) {
      s.errors.push({ type: 'invalid-key', key })
      return s
    }
    const [value, errors] = convertValue(optionEntry!.type || z.string(), key, state.rawArgs[key])
    if (errors) s.errors.push(...errors)
    s.args[name] = value

    return s
  }, state)
}

function fillDefaultOptions(state: processCommand.State) {
  const optionsMap = state.command.options || {}
  return reduceByKey(optionsMap, (p, key) => {
    // option `key` is specified by user
    if (p.args[key]) return p

    const options = optionsMap[key]
    if (typeof options === 'string' || options.default === undefined) return p

    p.args[key] = options.type instanceof z.ZodArray ? [options.default] : options.default
    return p
  }, state)
}

function lookupOptions(command: command.Command, key: string): [string, command.OptionEntry] | [] {
  if (!command.options) return []
  const options = command.options[key]
  if (!options) return []
  if (typeof options === 'string') return lookupOptions(command, options)
  return [key, options]
}

function convertValue(t: z.ZodType<any>, key: string, values: string[]) {
  const [r, errors] = parse(t, key, values)
  if (r.success) return [r.data, errors]

  errors.push({ type: 'invalid-value', key, value: values, message: r.error.message })
  return [undefined, errors]
}

function parse(t: z.ZodType<any>, key: string, values: string[]) {
  const [v, errors] = toParsable(t, key, values, [])
  return [t.safeParse(v), errors] as const
}

function toParsable(
  t: z.ZodType<any>,
  key: string,
  values: string[],
  errors: processArgv.Error[]
): [any, processArgv.Error[]] {
  if (t instanceof z.ZodBoolean) {
    if (values.length > 1) errors.push({ type: 'expect-single', key, keyType: t, value: values })
    return toBoolean(key, values[values.length - 1], errors)
  }
  if (t instanceof z.ZodNumber) {
    if (values.length > 1) errors.push({ type: 'expect-single', key, keyType: t, value: values })
    return toNumber(key, values[values.length - 1], errors)
  }
  if (t instanceof z.ZodString) {
    if (values.length > 1) errors.push({ type: 'expect-single', key, keyType: t, value: values })
    return [values[values.length - 1], errors]
  }
  if (t instanceof z.ZodArray) {
    if (t instanceof z.ZodBoolean) {
      return values.reduce(([i, e], v) => {
        const [r, errors] = toBoolean(key, v, e)
        i.push(r)
        return [i, errors]
      }, [[] as Array<boolean | undefined>, errors])
    }
    if (t instanceof z.ZodNumber) {
      return values.reduce(([i, e], v) => {
        const [r, errors] = toNumber(key, v, e)
        i.push(r)
        return [i, errors]
      }, [[] as Array<number | undefined>, errors])
    }
    if (t instanceof z.ZodString) {
      return [values, errors]
    }
  }
  // not supported zod type
  return [undefined, errors]
}

function toBoolean(
  key: string,
  value: string,
  errors: processArgv.Error[]
): [boolean | undefined, processArgv.Error[]] {
  if (value.toLowerCase() === 'true') return [true, errors]
  if (value.toLowerCase() === 'false') return [false, errors]
  errors.push({ type: 'invalid-value', key, value, message: 'expected to be boolean' })
  return [undefined, errors]
}

function toNumber(
  key: string,
  value: string,
  errors: processArgv.Error[]
): [number | undefined, processArgv.Error[]] {
  if (!Number.isNaN(value)) return [+value, errors]

  errors.push({ type: 'invalid-value', key, value, message: 'expected to be number' })
  return [undefined, errors]
}
// function convertValues(
//   options: command.OptionEntry,
//   key: string,
//   values: string[]): [boolean[] | number[] | string[], processArgv.Error[]] {
//   const errors: processArgv.Error[] = []
//   const t = options.type
//   if (t instanceof z.ZodArray) {
//     if (t.element instanceof
// }
//   switch (options.type) {
//     case 'boolean':
//       return [values.map(value => {
//         if (value.toLowerCase() === 'true') return true
//         if (value.toLowerCase() === 'false') return false
//         errors.push({ type: 'invalid-value-type', key, keyType: options.type, value })
//         return false
//       }), errors]
//     case 'number':
//       return [values.map(value => {
//         if (Number.isNaN(value)) {
//           errors.push({ type: 'invalid-value-type', key, keyType: options.type, value })
//           return value
//         }
//         return +value
//       }).filter(v => !Number.isNaN(v)) as number[], errors]
//     default:
//       return [values, errors]
//   }
// }
