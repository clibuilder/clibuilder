import { createStandardLog } from 'standard-log'
import { loadConfig } from './config.js'
import { loadPlugins } from './loadPlugins.js'
import type { Command } from './typesInternal.js'
import { createBuilderUI, createUI } from './ui.js'

/**
 * Creates an app context that provides interactions to external system
 * This
 */
export function context() {
  const cwd = process.cwd()
  const sl = createStandardLog()
  let config: any
  let loadingCommands: Promise<Command[]>
  return {
    async loadConfig(configName: string) {
      if (config) return config
      return config = await loadConfig({ cwd, ui: this.ui }, configName)
    },
    async loadPlugins(pluginNames: string[]) {
      if (loadingCommands) return loadingCommands
      return loadingCommands = loadPlugins({ cwd, ui: this.ui }, pluginNames)
    },
    cwd,
    exit: process.exit,
    createUI(id: string) { return createUI(sl.getLogger(id)) },
    ui: createBuilderUI(createUI(sl.getLogger('clibuilder'))),
  }
}

export type Context = ReturnType<typeof context>
