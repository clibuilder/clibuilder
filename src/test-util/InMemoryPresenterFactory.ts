import { PresenterFactory, PresenterOption } from '../presenter';
import { InMemoryPresenter } from './InMemoryPresenter';

export class InMemoryPresenterFactory implements PresenterFactory {
  cliPresenter: InMemoryPresenter | undefined
  commandPresenter: InMemoryPresenter | undefined
  createCliPresenter: (options: PresenterOption) => InMemoryPresenter
  createCommandPresenter: (options: PresenterOption) => InMemoryPresenter
  constructor() {
    this.createCliPresenter = function (this: InMemoryPresenterFactory, options: PresenterOption) {
      this.cliPresenter = this.cliPresenter || new InMemoryPresenter(options)
      return this.cliPresenter
    }.bind(this)
    this.createCommandPresenter = function (this: InMemoryPresenterFactory, options: PresenterOption) {
      this.commandPresenter = this.commandPresenter || new InMemoryPresenter(options)
      return this.commandPresenter
    }.bind(this)
  }
}
