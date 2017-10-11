import { PresenterFactory } from '../PresenterFactory'
import { InMemoryPresenter } from './InMemoryPresenter';

export class InMemoryPresenterFactory extends PresenterFactory {
  createCliPresenter(options) {
    return new InMemoryPresenter(options)
  }
  createCommandPresenter(options) {
    return new InMemoryPresenter(options)
  }
}
