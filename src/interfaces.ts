import { PresenterFactory } from './PresenterFactory'

export interface CliContext {
  cwd: string
  presenterFactory: PresenterFactory
}
