
import { HelpPresenter, Inquirer, LogPresenter, PresenterOption, VersionPresenter } from './interfaces';
import { PlainPresenter } from './PlainPresenter';

export const plainPresenterFactory = {
  createCliPresenter(options: PresenterOption): LogPresenter & HelpPresenter & VersionPresenter {
    return new PlainPresenter(options)
  },
  createCommandPresenter(options: PresenterOption): LogPresenter & HelpPresenter & Inquirer {
    return new PlainPresenter(options)
  }
}
