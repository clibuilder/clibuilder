import path from 'path'
import type { cli, PluginActivationContext } from './cli.js'
import { createUI } from './ui.js'


export async function loadPlugins({ cwd, ui }: { cwd: string, ui: Pick<createUI.UI, 'warn' | 'debug'> }, pluginNames: string[]) {
  return await activatePlugins(cwd, ui, pluginNames)
}

async function activatePlugins(cwd: string, ui: Pick<createUI.UI, 'warn' | 'debug'>, pluginNames: string[]) {
  const entries = await Promise.all(pluginNames.map(async name => {
    const pluginModule = await loadModule(cwd, ui, name)
    return { name, pluginModule }
  }))

  const commands: cli.Command<any, any>[] = []
  entries.filter(({ name, pluginModule }) => {
    if (!isValidPlugin(pluginModule)) {
      ui.warn('not a valid plugin', name)
      return false
    }
    return true
  }).forEach(({ name, pluginModule }) => {
    ui.debug('activating plugin', name)
    activatePlugin(pluginModule).forEach(cmd => {
      ui.debug('adding command', cmd.name)
      commands.push(cmd)
    })
    ui.debug('activated plugin', name)
  })
  return commands
}

async function loadModule(cwd: string, ui: Pick<createUI.UI, 'warn'>, name: string) {
  const pluginPath = path.resolve(cwd, 'node_modules', name)
  try {
    return await import(pluginPath)
  }
  catch (e: any) {
    ui.warn(`Unable to load plugin from ${name}. Please let the plugin author knows about it.`)
    ui.warn(`plugin path: ${pluginPath}`)
    ui.warn(`error: `, e.message || e)
    return undefined
  }
}

function isValidPlugin(m: any) {
  return m && typeof m.activate === 'function'
}

function activatePlugin(m: { activate: (context: PluginActivationContext) => void }) {
  const commands: cli.Command[] = []
  m.activate({ addCommand: cmd => commands.push(cmd) })
  return commands
}
