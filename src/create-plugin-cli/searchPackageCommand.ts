import { searchByKeywords } from 'search-packages'
import { required } from 'type-plus'
import { createPluginCommand } from './createPluginCommand'

export const searchPackageCommand = createPluginCommand({
  name: 'search',
  description: 'search for npm packages by keywords',
  context: { _dep: { searchByKeywords } },
  arguments: [{
    name: 'keywords',
    required: true,
    multiple: true,
  }],
  async run(args) {
    if (!this.keyword) {
      this.ui.error('plugins search command can only be used by PluginCli')
      return
    }

    // limitation
    const keywords = args.keywords as unknown as string[]

    const dep = required({ searchByKeywords }, this._dep)

    const packages = await dep.searchByKeywords(keywords)
    if (packages.length === 0) {
      this.ui.info(`no packages with keywords: ${keywords.join()}`)
    }
    else if (packages.length === 1) {
      this.ui.info(`found one package: ${packages[0]}`)
    }
    else {
      this.ui.info('found multiple packages:')
      this.ui.info('')
      packages.forEach(p => this.ui.info(`  ${p}`))
    }
  },
})
