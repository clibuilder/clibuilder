import { findByKeywords } from 'find-installed-packages';
import { CliCommand, CliCommandInstance } from '../cli-command';
import { PluginCli } from '../plugin-cli';
import { PlainPresenter } from '../presenter';

export const listCommand: CliCommand = {
  name: 'list',
  alias: ['ls'],
  description: 'List plugins available to the cli',
  async run() {
    const cli = getPluginCli(this)
    if (!cli || !cli.keyword) {
      this.ui.error('plugins list command can only be used by PluginCli')
      return
    }

    const plugins = await findByKeywords([cli.keyword], this.context)
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
  ui: new PlainPresenter(),
}

function getPluginCli<Config, Context>(subject: CliCommandInstance<Config, Context> | undefined): PluginCli | undefined {
  let p: any = subject
  while (p.parent) p = p.parent
  return p
}
