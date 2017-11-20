import { PresenterFactory } from '../PresenterFactory'
import { InMemoryPresenter } from './InMemoryPresenter';

export class InMemoryPresenterFactory extends PresenterFactory {
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
