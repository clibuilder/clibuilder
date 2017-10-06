import path = require('path')

import { findPlugins } from './findPlugins'
import { PluginConfig } from './interfaces'

class Registrar {
  config: PluginConfig

  register(config: PluginConfig) {
    this.config = config
  }
}

export function loadPlugins(keyword, { cwd } = { cwd: '.' }) {
  const pluginNames = findPlugins(keyword, cwd)
  const globalPluginNames = findPlugins(keyword, process.env.PWD)

  let r = activatePlugins(pluginNames, cwd);

  globalPluginNames.forEach(p => {
    if (pluginNames.indexOf(p) !== -1)
      return
    const m = loadModule(p, process.env.PWD!)
    if (isValidPlugin(m))
      r.push(activatePlugin(m))
  })

  return r
}

function activatePlugins(pluginNames: string[], cwd: string) {
  return pluginNames
    .map(p => loadModule(p, cwd))
    .filter(isValidPlugin)
    .map(m => activatePlugin(m))
}

function loadModule(name, cwd) {
  const pluginPath = path.resolve(cwd, 'node_modules', name)
  return require(pluginPath)
}

function isValidPlugin(m) {
  return typeof m.activate === 'function'
}

function activatePlugin(m) {
  const registrar = new Registrar()
  m.activate(registrar)
  return registrar.config
}
