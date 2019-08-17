import { CliCommand } from '../cli-command';
import { listCommand } from './listCommand';
import { searchPackageCommand } from './searchPackageCommand';

export const pluginsCommand: CliCommand = {
  name: 'plugins',
  description: 'Commands related to the plugins of the cli',
  commands: [listCommand, searchPackageCommand],
}
