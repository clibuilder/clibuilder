import { findByKeywords } from 'find-installed-packages'
import { CliCommand } from '../cli-command'
import { PlainPresenter } from '../presenter'
import { getPluginCli } from './getPluginCli'

export const listPluginsCommand: CliCommand = {
  name: 'list',
  alias: ['ls'],
  description: 'List installed plugins',
  async run() {
    const cli = getPluginCli(this)
    if (!cli || !cli.keyword) {
      this.ui.error('plugins list command can only be used by PluginCli')
      return
    }

    const plugins = await findByKeywords([cli.keyword], this.context)
    if (plugins.length === 0) {
      this.ui.info(`no plugin with keyword: ${cli.keyword}`)
    }
    else if (plugins.length === 1) {
      this.ui.info(`found one plugin: ${plugins[0]}`)
    }
    else {
      this.ui.info('found the following plugins:')
      this.ui.info('')
      plugins.forEach(p => this.ui.info(`  ${p}`))
    }
  },
  ui: new PlainPresenter(),
}
