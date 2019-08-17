import { searchByKeywords } from 'search-packages';
import { required } from 'type-plus';
import { CliCommand } from '../cli-command';

export const searchPackageCommand: CliCommand<never, { _dep: { searchByKeywords: typeof searchByKeywords } }> = {
  name: 'search',
  description: 'search for npm packages by keywords',
  arguments: [{
    name: 'keywords',
    required: true,
    multiple: true,
  }],
  async run(args) {
    const { keywords } = args
    const dep = required({ searchByKeywords }, this.context._dep)

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
}
