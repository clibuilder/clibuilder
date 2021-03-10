import { findByKeywords } from 'find-installed-packages'
import { searchByKeywords } from 'search-packages'
import * as z from 'zod'
import { command } from './command'

export function getBaseCommand(description: string) {
  return command({
    name: '',
    description,
    options: {
      'help': {
        type: z.optional(z.boolean()),
        description: 'Print help message',
        alias: ['h']
      },
      'version': {
        type: z.optional(z.boolean()),
        description: 'Print the CLI version',
        alias: ['v']
      },
      'verbose': {
        type: z.optional(z.boolean()),
        description: 'Turn on verbose logging',
        alias: ['V']
      },
      'silent': {
        type: z.optional(z.boolean()),
        description: 'Turn off logging',
      },
      'debug-cli': {
        type: z.optional(z.boolean()),
        description: 'Display clibuilder debug messages',
      },
    },
    run() {
      this.ui.showHelp()
    }
  })
}

export const listPluginsCommand = command({
  name: 'list',
  alias: ['ls'],
  description: 'List installed plugins',
  context: { findByKeywords },
  async run() {
    const plugins = await this.context.findByKeywords([this.keyword], this)
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
})

export const searchPluginsCommand = command({
  name: 'search',
  description: 'Search only for available plugins',
  context: { searchByKeywords },
  async run() {
    const packages = await this.context.searchByKeywords([this.keyword])
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
  }
})

export const pluginsCommand = command({
  name: 'plugins',
  description: 'Commands related to the plugins of the cli',
  commands: [listPluginsCommand, searchPluginsCommand]
})
