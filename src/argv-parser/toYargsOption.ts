import { Cli2 } from '../cli/types'

export function toYargsOption(options: Cli2.Options | undefined) {
  if (!options) {
    return {}
  }
  const result: any = { alias: {}, default: {} }
  fillOptions(options, 'boolean')
  fillOptions(options, 'string')
  fillOptions(options, 'number')

  return result

  function fillOptions(options: Cli2.Options, typeName: keyof Cli2.Options) {
    if (options[typeName]) {
      const values = options[typeName]!
      result[typeName] = Object.keys(values)
      result[typeName].forEach((k: string) => {
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
