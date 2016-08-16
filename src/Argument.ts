import camelCase = require('camel-case')

export class Argument {
  name: string
  variadic: boolean
  required: boolean
  optional: boolean
  constructor(public arg: string, public description: string = '', public choiceDescription?: { [name: string]: string }) {
    this.required = !!~arg.indexOf('<')
    this.optional = !!~arg.indexOf('[')
    const token = arg.substring(1, arg.length - 1)
    this.name = camelCase(token)
    if (token.length > 3 && token.slice(-3) === '...') {
      this.variadic = true
    }
  }
}
