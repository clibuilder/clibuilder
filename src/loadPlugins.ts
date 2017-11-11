import path = require('path')
import findup = require('find-up')

import { findPlugins } from './findPlugins'
import { Command } from './Command'
import { log } from './log';

export interface Registrar {
  addCommand(command: Command<any, { [x: string]: any }>): void
}

class CliRegistrarImpl {
  command: Command

  addCommand(command: Command) {
    this.command = command
  }
}

export function loadPlugins(keyword, { cwd } = { cwd: '.' }) {
  log.debug('loading plugins')
  const pluginNames = findPlugins(keyword, cwd)
  log.debug('found local plugins', pluginNames)

  const globalFolder = getGlobalPackageFolder(__dirname)
  const globalPluginNames = findPlugins(keyword, globalFolder)
  log.debug('found global plugins', globalPluginNames)

  let r = activatePlugins(pluginNames, cwd);

  globalPluginNames.forEach(p => {
    if (pluginNames.indexOf(p) !== -1)
      return
    const m = loadModule(p, globalFolder)
    if (isValidPlugin(m))
      r.push(activatePlugin(m))
  })

  return r
}

function getGlobalPackageFolder(folder): string {
  const indexToFirstNodeModulesFolder = folder.indexOf('node_modules')
  const basePath = indexToFirstNodeModulesFolder === -1 ? folder : folder.slice(0, indexToFirstNodeModulesFolder)
  return path.resolve(findup.sync('node_modules', { cwd: basePath }), '..')
}

function activatePlugins(pluginNames: string[], cwd: string) {
  return pluginNames
    .map(p => {
      return {
        name: p,
        pluginModule: loadModule(p, cwd)
      }
    })
    .filter(({ name, pluginModule }) => {
      if (!isValidPlugin(pluginModule)) {
        log.debug('not a valid plugin', name)
        return false
      }
      return true
    })
    .map(({ name, pluginModule }) => {
      log.debug('activating plugin', name)
      const plugin = activatePlugin(pluginModule)
      log.debug('activated plugin', name)
      return plugin
    })
}

function loadModule(name, cwd) {
  const pluginPath = path.resolve(cwd, 'node_modules', name)
  return require(pluginPath)
}

function isValidPlugin(m) {
  return typeof m.activate === 'function'
}

function activatePlugin(m) {
  const registrar = new CliRegistrarImpl()
  m.activate(registrar)
  return registrar.command
}
