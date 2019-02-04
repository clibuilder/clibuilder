import { HelpPresenter, Inquirer, LogPresenter, PresenterOption, VersionPresenter } from './presenter';

export interface PresenterFactory {
  createCliPresenter(options: PresenterOption): LogPresenter & HelpPresenter & VersionPresenter
  createCommandPresenter(options: PresenterOption): LogPresenter & HelpPresenter & Inquirer,
}
