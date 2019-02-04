import { PresenterFactory } from '../presenter';

export interface CliContext {
  cwd: string
  presenterFactory: PresenterFactory
}
