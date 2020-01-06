import { findByKeywords } from 'find-installed-packages'
import { PluginCli2 } from '../plugin-cli/types'

export const listPluginsCommand: PluginCli2.Command = {
  name: 'list',
  alias: ['ls'],
  description: 'List installed plugins',
  async run() {
    if (!this.keyword) {
      this.ui.error('plugins list command can only be used by PluginCli')
      return
    }

    const plugins = await findByKeywords([this.keyword], this)
    if (plugins.length === 0) {
      this.ui.info(`no plugin with keyword: ${this.keyword}`)
    }
    else if (plugins.length === 1) {
      this.ui.info(`found one plugin: ${plugins[0]}`)
    }
    else {
      this.ui.info('found the following plugins:')
      this.ui.info('')
      plugins.forEach(p => this.ui.info(`  ${p}`))
    }
  }
}
