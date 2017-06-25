
import { PresenterOption, LogPresenter, HelpPresenter, VersionPresenter } from './Presenter'
import { PlainPresenter } from './PlainPresenter'

export class PresenterFactory {
  createCliPresenter(options: PresenterOption): LogPresenter & HelpPresenter & VersionPresenter {
    return new PlainPresenter(options)
  }
  createCommandPresenter(options: PresenterOption): LogPresenter & HelpPresenter {
    return new PlainPresenter(options)
  }
}
