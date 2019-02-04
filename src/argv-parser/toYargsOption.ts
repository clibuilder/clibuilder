import { CliCommand } from '../cli-command';

export function toYargsOption(options: CliCommand.Options | undefined) {
  if (!options) {
    return {}
  }
  const result: any = { alias: {}, default: {} }
  fillOptions(options, 'boolean')
  fillOptions(options, 'string')
  fillOptions(options, 'number')

  return result

  function fillOptions(options: CliCommand.Options, typeName: keyof CliCommand.Options) {
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
