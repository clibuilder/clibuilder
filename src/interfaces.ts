import { CliCommand } from './CliCommand'
import { PresenterOption, LogPresenter, HelpPresenter, VersionPresenter, Inquirer } from './Presenter'

export interface Parsable {
  name: string
  arguments?: CliCommand.Argument[]
  commands?: Parsable[]
  options?: CliCommand.Options
}

export interface CliArgsWithoutDefaults {
  _: string[],
  [name: string]: any
}
export interface CliArgs extends CliArgsWithoutDefaults {
  _defaults: string[]
}

export interface PresenterFactory {
  createCliPresenter(options: PresenterOption): LogPresenter & HelpPresenter & VersionPresenter
  createCommandPresenter(options: PresenterOption): LogPresenter & HelpPresenter & Inquirer,
}
