import { PresenterFactory } from '../interfaces';

export interface CliContext {
  cwd: string
  presenterFactory: PresenterFactory
}
