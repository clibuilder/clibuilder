import camelCase = require('camel-case')

export class Argument {
  name: string
  variadic: boolean
  required: boolean
  optional: boolean
  constructor(public arg: string, public description: string = '') {
    this.required = !!~arg.indexOf('<')
    this.optional = !!~arg.indexOf('[')
    this.name = camelCase(arg.substring(1, arg.length - 1))
    if (this.name.length > 3 && this.name.slice(-3) === '...') {
      this.variadic = true
      this.name = this.name.slice(0, -3)
    }
  }
}
