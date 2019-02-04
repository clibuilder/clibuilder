import { BaseError } from 'make-error'

export class MultipleArgumentNotLastEntry extends BaseError {
  constructor(public commandName: string, public argumentName: string) {
    super(`'${commandName}' argument '${argumentName}' is marked as multiple but not the last entry.`)
  }
}
export class OptionNameNotUnique extends BaseError {
  constructor(public commandName: string, public optionName: string) {
    super(`'${commandName}' have declared multiple options with the same name '${optionName}'`)
  }
}
