import { CliCommand } from '../cli-command'

export interface ActivationContext {
  addCommand<Config, Context>(command: CliCommand<Config, Context>): void,
}
