import { findByKeywords } from 'find-installed-packages'
import { PluginCli } from './types'

export const listPluginsCommand: PluginCli.Command = {
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
      return []
    }
    else if (plugins.length === 1) {
      this.ui.info(`found one plugin: ${plugins[0]}`)
      return plugins
    }
    else {
      this.ui.info('found the following plugins:')
      this.ui.info('')
      plugins.forEach(p => this.ui.info(`  ${p}`))
      return plugins
    }
  }
}
