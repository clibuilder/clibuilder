import inquirer = require('inquirer')

import { DisplayLevel } from '../Display'
import { PlainPresenter } from '../PlainPresenter'

import { InMemoryDisplay } from './InMemoryDisplay'

export class InMemoryPresenter extends PlainPresenter {
  display = new InMemoryDisplay()
  displayLevel = DisplayLevel.Verbose
  constructor(options, public answers: inquirer.Answers = {}) {
    super(options)
    this.inquire = Object.assign(
      () => Promise.resolve(this.answers),
      {
        ...this.inquire
      }) as any
  }
}
