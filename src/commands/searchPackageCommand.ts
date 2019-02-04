import { CliCommand } from '../cli-command';
import { npmSearch } from './npmSearch';
import { unpartial } from 'unpartial';


export const searchPackageCommand: CliCommand<never, { _dep: { npmSearch: typeof npmSearch } }> = {
  name: 'search',
  description: 'search for npm packages by keywords',
  arguments: [{
    name: 'keywords',
    required: true,
    multiple: true
  }],
  async run(args) {
    const { keywords } = args
    const dep = unpartial({ npmSearch }, this.context._dep)
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
