import { CliCommand, CliCommandInstance } from '../CliCommand';
import { PluginCli } from '../PluginCli';
import { PlainPresenter } from '../PlainPresenter';
import { findByKeyword } from 'find-installed-packages'
const list = {
  name: 'list',
  alias: ['ls'],
  description: 'List plugins available to the cli',
  async run() {
    const cli = getPluginCli(this)
    if (!cli) {
      this.ui.error('plugins list command can only be used by PluginCli')
      return
    }

    const plugins = await findByKeyword(cli.keyword, this)
    if (plugins.length === 0) {
      this.ui.info(`no plugin with keyword: ${cli.keyword}`)
    }
    else if (plugins.length === 1) {
      this.ui.info(`found one plugin: ${plugins[0]}`)
    }
    else {
      this.ui.info('found the following plugins:')
      this.ui.info('')
      plugins.forEach(p => this.ui.info(`  ${p}`))
    }
  },
  ui: new PlainPresenter()
} as CliCommand

export const pluginsCommand = {
  name: 'plugins',
  description: 'Perform various commands related to the plugins of the cli',
  commands: [list]
} as CliCommand

function getPluginCli<Config, Context>(subject: CliCommandInstance<Config, Context> | undefined): PluginCli | undefined {
  if (!subject) return undefined
  if (subject.parent && subject.parent instanceof PluginCli) return subject.parent
  return getPluginCli(subject.parent as any)
}
