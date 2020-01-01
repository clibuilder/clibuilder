import { IsoError } from 'iso-error'

export class NotNumberOption extends IsoError {
  // istanbul ignore next
  constructor(public name: string) {
    super(`Option '${name}' only accepts number`)
    Object.setPrototypeOf(this, NotNumberOption.prototype)
  }
}

export class MissingArguments extends IsoError {
  // istanbul ignore next
  constructor(public expected: number, public actual: number) {
    super((expected <= 1 ? `Missing Argument.` : `Missing Arguments.`) + ` Expecting ${expected} but received ${actual}.`)
    Object.setPrototypeOf(this, MissingArguments.prototype)
  }
}

export class TooManyArguments extends IsoError {
  // istanbul ignore next
  constructor(public expected: number, public actual: number) {
    super(`Too Many Arguments. Expecting ${expected} but received ${actual}.`)
    Object.setPrototypeOf(this, TooManyArguments.prototype)
  }
}
