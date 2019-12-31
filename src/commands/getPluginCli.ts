import { CliCommandInstance } from '../cli-command'
import { PluginCli } from '../plugin-cli'

export function getPluginCli<Config, Context>(subject: CliCommandInstance<Config, Context> | undefined): PluginCli | undefined {
  let p: any = subject
  while (p.parent) p = p.parent
  return p
}
