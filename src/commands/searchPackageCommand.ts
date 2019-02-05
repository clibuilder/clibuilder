import { CliCommand } from '../cli-command';
import { searchByKeywords } from 'search-packages';
import { unpartial } from 'unpartial';


export const searchPackageCommand: CliCommand<never, { _dep: { npmSearch: typeof searchByKeywords } }> = {
  name: 'search',
  description: 'search for npm packages by keywords',
  arguments: [{
    name: 'keywords',
    required: true,
    multiple: true
  }],
  async run(args) {
    const { keywords } = args
    const dep = unpartial({ npmSearch: searchByKeywords }, this.context._dep)
    const packages = await dep.npmSearch(keywords)
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
  }
}
