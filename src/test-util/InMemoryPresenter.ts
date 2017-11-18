import inquirer = require('inquirer')

import { DisplayLevel } from '../Display'
import { PlainPresenter } from '../PlainPresenter'

import { InMemoryDisplay } from './InMemoryDisplay'
import { PresenterOption } from '../Presenter';

export class InMemoryPresenter extends PlainPresenter {
  display = new InMemoryDisplay()
  displayLevel = DisplayLevel.Verbose
  constructor(options: PresenterOption, public answers: inquirer.Answers = {}) {
    super(options)
    this.inquire = Object.assign(
      () => Promise.resolve(this.answers),
      {
        ...this.inquire
      }) as any
  }
}
