export class Option {
  required: boolean
  optional: boolean
  bool: boolean
  short: string | undefined
  long: string | undefined
  constructor(public flags: string, public description: string = '') {
    this.required = !!~flags.indexOf('<')
    this.optional = !!~flags.indexOf('[')
    this.bool = !~flags.indexOf('-no-')
    const tokens = flags.split(/[ ,|]+/)
    if (!/^[[<]/.test(tokens[1])) {
      this.short = tokens.shift()
    }
    this.long = tokens.shift()
  }
}
