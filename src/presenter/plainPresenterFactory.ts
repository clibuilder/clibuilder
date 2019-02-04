
import { PresenterOption, LogPresenter, HelpPresenter, VersionPresenter, Inquirer } from './presenter'
import { PlainPresenter } from './PlainPresenter'

export const plainPresenterFactory = {
  createCliPresenter(options: PresenterOption): LogPresenter & HelpPresenter & VersionPresenter {
    return new PlainPresenter(options)
  },
  createCommandPresenter(options: PresenterOption): LogPresenter & HelpPresenter & Inquirer {
    return new PlainPresenter(options)
  }
}