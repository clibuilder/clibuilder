import { CliCommand } from '../CliCommand'
import { PlainPresenter } from '../PlainPresenter'

const list = {
  name: 'list',
  alias: ['ls'],
  ui: new PlainPresenter(),
  description: 'List plugins available to the cli',
  run() {
    this.ui.info('plugins...')
  }
} as CliCommand

export const pluginsCommand = {
  name: 'plugins',
  description: 'Perform various commands related to the plugins of the cli',
  commands: [list]
} as CliCommand
