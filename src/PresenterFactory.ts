
import { PresenterOption, LogPresenter, HelpPresenter, VersionPresenter, Inquirer } from './Presenter'
import { PlainPresenter } from './PlainPresenter'

export class PresenterFactory {
  createCliPresenter(options: PresenterOption): LogPresenter & HelpPresenter & VersionPresenter {
    return new PlainPresenter(options)
  }
  createCommandPresenter(options: PresenterOption): LogPresenter & HelpPresenter & Inquirer {
    return new PlainPresenter(options)
  }
}
