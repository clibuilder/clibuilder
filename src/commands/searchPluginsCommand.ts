import { searchByKeywords } from 'search-packages'
import { required } from 'type-plus'
import { PluginCli } from '../plugin-cli/types'

export const searchPluginsCommand: PluginCli.Command<never, { _dep: { searchByKeywords: typeof searchByKeywords }, keyword: string }> = {
  name: 'search',
  description: 'Search online for available plugins',
  async run() {
    if (!this.keyword) {
      this.ui.error('plugins search command can only be used by PluginCli')
      return
    }
    const dep = required({ searchByKeywords }, this._dep)

    const packages = await dep.searchByKeywords([this.keyword])
    if (packages.length === 0) {
      this.ui.info(`no package with keyword: ${this.keyword}`)
    }
    else if (packages.length === 1) {
      this.ui.info(`found one package: ${packages[0]}`)
    }
    else {
      this.ui.info('found the following packages:')
      this.ui.info('')
      packages.forEach(p => this.ui.info(`  ${p}`))
    }
  },
}
