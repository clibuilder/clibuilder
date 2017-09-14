
import { PresenterOption, LogPresenter, HelpPresenter, VersionPresenter,PromptPresenter } from './Presenter'
import { PlainPresenter } from './PlainPresenter'

export class PresenterFactory {
  createCliPresenter(options: PresenterOption): LogPresenter & HelpPresenter & VersionPresenter & PromptPresenter {
    return new PlainPresenter(options)
  }
  createCommandPresenter(options: PresenterOption): LogPresenter & HelpPresenter & PromptPresenter{
    return new PlainPresenter(options)
  }
}
