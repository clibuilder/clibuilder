import { CliCommand } from '../cli-command';

export interface Registrar {
  addCommand<Config, Context>(command: CliCommand<Config, Context>): void
}
