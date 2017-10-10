import path = require('path')
import findup = require('find-up')

import { findPlugins } from './findPlugins'
import { Command } from './Command'

export interface CliRegistrar {
  addCommand(command: Command<any>): void
}

class CliRegistrarImpl {
  command: Command

  addCommand(command: Command) {
    this.command = command
  }
}

export function loadPlugins(keyword, { cwd } = { cwd: '.' }) {
  const pluginNames = findPlugins(keyword, cwd)
  const globalPluginNames = findPlugins(keyword, getGlobalPackageFolder(__dirname))

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

function getGlobalPackageFolder(folder): string {
  const indexToFirstNodeModulesFolder = folder.indexOf('node_modules')
  const basePath = indexToFirstNodeModulesFolder === -1 ? folder : folder.slice(0, indexToFirstNodeModulesFolder)
  return path.resolve(findup.sync('node_modules', { cwd: basePath }), '..')
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
  const registrar = new CliRegistrarImpl()
  m.activate(registrar)
  return registrar.command
}
