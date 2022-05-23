import { findKey, reduceByKey } from 'type-plus'
import type { cli } from './cli'
import { parseArgv } from './parseArgv'
import { isZodArray, isZodBoolean, isZodNumber, isZodOptional, isZodString, z } from './zod'

namespace lookupCommand {
  export type Result = {
    command: cli.Command,
    args: {
      __?: string[] | undefined
    } & Record<string, string[]>,
    errors: Error[]
  }
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
    name: string,
    values: string[]
  }
  export type MissingArgument = {
    type: 'missing-argument',
    name: string
  }
}

export function lookupCommand(command: cli.Command, args: parseArgv.Result)
  : lookupCommand.Result {
  const m = matchCommand(command, args)!
  return processCommand(m[0], m[1])
}

function matchCommand(command: cli.Command, rawArgs: parseArgv.Result)
  : [cli.Command, parseArgv.Result] | undefined {
  if (command.commands) {
    const commands = command.commands
    for (let i = commands.length - 1; i >= 0; i--) {
      const command = commands[i]
      if (!command.name) return [command, rawArgs]
      if (rawArgs._[0] !== command.name) continue
      rawArgs._.shift()
      if (command.commands) {
        const m = matchCommand(command, rawArgs)
        return m ? m : [command, rawArgs]
      }
      return [command, rawArgs]
    }
  }
  return [command, rawArgs]
}

namespace processCommand {
  export type State = {
    command: cli.Command,
    rawArgs: parseArgv.Result,
    errors: lookupCommand.Error[],
    args: { _: string[] } & Record<string, any>
  }
}
function processCommand(command: cli.Command, rawArgs: parseArgv.Result) {
  const state: processCommand.State = { command, rawArgs, args: { _: [] }, errors: [] }
  return fillDefaultOptions(fillInputOptions(fillArguments(state)))
}

function fillArguments(state: processCommand.State) {
  const command = state.command
  const args = [...state.rawArgs._]
  const argSpecs = command.arguments || []
  state.args = argSpecs.reduce((p, s) => {
    if (args.length === 0) {
      if (!isZodOptional(s.type)) state.errors.push({ type: 'missing-argument', name: s.name })
      return p
    }
    if (isZodArray(s.type)) {
      const e = s.type.element
      let r = e.safeParse(args[0])
      p.args[s.name] = p.args[s.name] || []
      while (r.success) {
        p.args[s.name].push(r.data)
        args.pop()
        r = e.safeParse(args[0])
      }
    }
    else {
      p.args[s.name] = args.pop()!
    }
    return p
  }, { args: { _: [] } as { _: string[] } & Record<any, any> }).args
  if (args.length > 0) {
    state.errors.push({ type: 'extra-arguments', name: command.name, values: args })
  }
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
    const [name, optionEntry] = lookupOptions(state.command!, key)
    if (!name) {
      s.errors.push({ type: 'invalid-key', key })
      return s
    }
    const [value, errors] = convertValue(optionEntry!.type || z.optional(z.string()), key, state.rawArgs[key])
    if (errors) s.errors.push(...errors)
    s.args[name] = value

    return s
  }, state)
}

function fillDefaultOptions(state: processCommand.State) {
  const optionsMap = state.command.options || {}
  return reduceByKey(optionsMap, (p, key) => {
    if (p.args[key]) return p

    const options = optionsMap[key]
    if (typeof options === 'string' || options.default === undefined) return p

    p.args[key] = isZodArray(options.type) ? [options.default] : options.default
    return p
  }, state)
}

function lookupOptions(command: cli.Command, key: string)
  : [string, cli.Command.Options.Entry] | [] {
  const opts = command.options
  if (!opts) return []
  const options = opts[key]
  if (options) return [key, options]
  const optKey = findKey(opts, (k) => {
    const opt = opts[k]
    if (!opt.alias) return false
    // console.log(key, k, opt)
    return opt.alias.some(a => a === key || (a as { alias: string }).alias === key)
  })
  return optKey ? [optKey, opts[optKey]] : []
}

function convertValue(t: z.ZodType<any>, key: string, values: string[]) {
  const [r, errors] = parse(t, key, values)
  return [r.success ? r.data : undefined, errors]
}

function parse(t: z.ZodType<any>, key: string, values: string[]) {
  const [v, errors] = toParsable(t, key, values, [])
  return [t.safeParse(v), errors] as const
}

function toParsable(
  t: z.ZodType<any>,
  key: string,
  values: string[],
  errors: lookupCommand.Error[]
): [any, lookupCommand.Error[]] {
  if (isZodOptional(t)) {
    return toParsable(t._def.innerType, key, values, errors)
  }
  if (isZodBoolean(t)) {
    if (values.length > 1) errors.push({ type: 'expect-single', key, keyType: t, value: values })
    return toBoolean(key, values[values.length - 1], errors)
  }
  if (isZodNumber(t)) {
    if (values.length > 1) errors.push({ type: 'expect-single', key, keyType: t, value: values })
    return toNumber(key, values[values.length - 1], errors)
  }
  if (isZodString(t)) {
    if (values.length > 1) errors.push({ type: 'expect-single', key, keyType: t, value: values })
    return [values[values.length - 1], errors]
  }
  if (isZodArray(t)) {
    const e = t.element
    if (isZodBoolean(e)) {
      return values.reduce(([i, e], v) => {
        const [r, errors] = toBoolean(key, v, e)
        i.push(r)
        return [i, errors]
      }, [[] as Array<boolean | undefined>, errors])
    }
    if (isZodNumber(e)) {
      return values.reduce(([i, e], v) => {
        const [r, errors] = toNumber(key, v, e)
        i.push(r)
        return [i, errors]
      }, [[] as Array<number | undefined>, errors])
    }
    if (isZodString(e)) {
      return [values, errors]
    }
  }
  // not supported zod type
  // istanbul ignore next
  return [undefined, errors]
}

function toBoolean(
  key: string,
  value: string,
  errors: lookupCommand.Error[]
): [boolean | undefined, lookupCommand.Error[]] {
  if (value.toLowerCase() === 'true') return [true, errors]
  if (value.toLowerCase() === 'false') return [false, errors]
  errors.push({ type: 'invalid-value', key, value, message: 'expected to be boolean' })
  return [undefined, errors]
}

function toNumber(
  key: string,
  value: string,
  errors: lookupCommand.Error[]
): [number | undefined, lookupCommand.Error[]] {
  const num = +value
  if (typeof num === 'number' && !Number.isNaN(num)) return [num, errors]

  errors.push({ type: 'invalid-value', key, value, message: 'expected to be number' })
  return [undefined, errors]
}

