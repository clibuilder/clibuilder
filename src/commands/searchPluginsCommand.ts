import { searchByKeywords } from 'search-packages'
import { required } from 'type-plus'
import { CliCommand } from '../cli-command'
import { getPluginCli } from './getPluginCli'

export const searchPluginsCommand: CliCommand<never, { _dep: { searchByKeywords: typeof searchByKeywords } }> = {
  name: 'search',
  description: 'Search online for available plugins',
  async run() {
    const cli = getPluginCli(this)
    if (!cli || !cli.keyword) {
      this.ui.error('plugins search command can only be used by PluginCli')
      return
    }
    const dep = required({ searchByKeywords }, this.context._dep)

    const packages = await dep.searchByKeywords([cli.keyword])
    if (packages.length === 0) {
      this.ui.info(`no package with keyword: ${cli.keyword}`)
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
