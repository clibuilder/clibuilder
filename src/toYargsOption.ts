export function toYargsOption(options) {
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
