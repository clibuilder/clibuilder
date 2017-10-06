import { CommandSpec } from './Command'
export interface PluginConfig {
  name: string
  commands: CommandSpec[]
}
