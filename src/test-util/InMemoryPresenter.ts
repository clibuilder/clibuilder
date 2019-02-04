import inquirer from 'inquirer';
import { DisplayLevel, PlainPresenter, PresenterOption } from '../presenter';
import { InMemoryDisplay } from './InMemoryDisplay';

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
