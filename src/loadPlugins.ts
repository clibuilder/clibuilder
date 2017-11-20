import path = require('path')
import findup = require('find-up')

import { findPlugins } from './findPlugins'
import { CliCommand } from './CliCommand'
import { log } from './log';

export interface Registrar {
  addCommand(command: CliCommand<any, { [x: string]: any }>): void
}

class CliRegistrarImpl {
  command: CliCommand

  addCommand(command: CliCommand) {
    this.command = command
  }
}

export async function loadPlugins(keyword, { cwd } = { cwd: '.' }) {
  log.debug('loading plugins')

  const findingLocal = findPlugins(keyword, cwd).then(pluginNames => {
    log.debug('found local plugins', pluginNames)
    return pluginNames
  })

  const globalFolder = getGlobalPackageFolder(__dirname)
  const findingGlobal = findPlugins(keyword, globalFolder).then(globalPluginNames => {
    log.debug('found global plugins', globalPluginNames)
    return globalPluginNames
  })

  return Promise.all([findingLocal, findingGlobal]).then(([pluginNames, globalPluginNames]) => {
    let commands = activatePlugins(pluginNames, cwd);

    globalPluginNames.forEach(p => {
      if (pluginNames.indexOf(p) !== -1)
        return
      const m = loadModule(p, globalFolder)
      if (isValidPlugin(m))
        commands.push(activatePlugin(m))
    })

    return commands
  })
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
