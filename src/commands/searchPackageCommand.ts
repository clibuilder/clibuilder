import { searchByKeywords } from 'search-packages'
import { required } from 'type-plus'
import { PluginCli2 } from '../plugin-cli/types'

export const searchPackageCommand: PluginCli2.Command<never, { _dep: { searchByKeywords: typeof searchByKeywords }, keyword: string }> = {
  name: 'search',
  description: 'search for npm packages by keywords',
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

    // couldn't figure out it yet
    // https://www.typescriptlang.org/play/?ssl=11&ssc=22&pln=10&pc=24#code/LAKApgHgDg9gTgFwAQIJ5TEggnA5gVwFswA7BAHgDkBDYpSBUgEwGckWE4BLE3JAXnaceuAHwCkAZREAbMDgLEyVWmHEAfJAFl8MhFwVFSFGsXGhIsRCnSZpvOYaUnV9CIxKsh3XhI4+xCQBvUCQkElUALiRTMAAaUKQmMBYAY24ofRgSAH5o-xEEkDC4MABHfC5SpjykACMYGDlqEiKAXwtoeGQ0DG1dfSdjFToGZjYC30FJwMEQ4vComNUisOS0jKzc-OFeVaRSiqqwGuiGprAW-cIBrig5M8bmklAOkE6rHttsPCMyWJYACUwKl4ExyFg3B4vEMyOJBJCxp42Do9AZfs4kDkkEEkABtADSSB42DxAHIIsQyQBdak7AJ46lINpIaK4wnEkikimqGl07wiZmgUCgkgcJAQYKLYjRMnUMlxJA3NH3MDRTj4TBvUXi1BSylqpByslC95mgBm+BIqS2SHNjRGmCRXhmogAFBBorCXGYAJQ4xKlBD4OBcoIs6hsb0A4GguDg3pgGDmiWiV7CkD2mAe30AOmoYQA9IX2AALGC6Jj1TAzRmgLNu1B5gtIYtlisyKt1Gu7XCgIA
    const { keywords } = args as any as { keywords: string[] }

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
}
