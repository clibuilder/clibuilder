import { PresenterFactory } from '../presenter';

export interface CliContext {
  cwd: string
  presenterFactory: PresenterFactory
}

export type NoConfig = never
