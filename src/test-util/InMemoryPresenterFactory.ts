import { InMemoryPresenter } from './InMemoryPresenter'
import { PresenterFactory } from '../interfaces'
import { PresenterOption } from '../Presenter';

export class InMemoryPresenterFactory implements PresenterFactory {
  cliPresenter: InMemoryPresenter | undefined
  commandPresenter: InMemoryPresenter | undefined
  createCliPresenter(options: PresenterOption) {
    this.cliPresenter = this.cliPresenter || new InMemoryPresenter(options)
    return this.cliPresenter
  }
  createCommandPresenter(options: PresenterOption) {
    this.commandPresenter = this.commandPresenter || new InMemoryPresenter(options)
    return this.commandPresenter
  }
}
