export class Option {
  required: boolean
  optional: boolean
  bool: boolean
  short: string | undefined
  long: string | undefined
  constructor(public flags: string, public description: string = '', public valuesDescription?: { [name: string]: string }) {
    this.required = !!~flags.indexOf('<')
    this.optional = !!~flags.indexOf('[')
    this.bool = !(this.required || this.optional)
    const tokens = flags.split(/[ ,|]+/)
    if (/^--/.test(tokens[0])) {
      this.long = tokens.shift()
    }
    else {
      this.short = tokens.shift()
      this.long = tokens.shift()
    }
  }
}
