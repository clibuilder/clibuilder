import { InMemoryPresenter } from './InMemoryPresenter'
import { PresenterFactory } from '../interfaces'

export class InMemoryPresenterFactory implements PresenterFactory {
  cliPresenter: InMemoryPresenter
  commandPresenter: InMemoryPresenter
  createCliPresenter(options) {
    this.cliPresenter = this.cliPresenter || new InMemoryPresenter(options)
    return this.cliPresenter
  }
  createCommandPresenter(options) {
    this.commandPresenter = this.commandPresenter || new InMemoryPresenter(options)
    return this.commandPresenter
  }
}
