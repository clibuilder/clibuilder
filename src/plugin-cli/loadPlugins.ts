import { findByKeywords } from 'find-installed-packages'
import findup from 'find-up'
import path from 'path'
import { CliCommand } from '../cli-command'
import { log } from '../log'
import { ActivationContext } from './types'

export async function loadPlugins(keyword: string, { cwd } = { cwd: '.' }) {
  log.debug(`look up plugins with keyword: ${keyword}`)

  const findingLocal = findByKeywords([keyword], { cwd }).then(pluginNames => {
    log.debug('found local plugins', pluginNames)
    return pluginNames
  })

  const globalFolder = getGlobalPackageFolder(__dirname)
  const findingGlobal = findByKeywords([keyword], { cwd: globalFolder }).then(globalPluginNames => {
    log.debug('found global plugins', globalPluginNames)
    return globalPluginNames
  })

  return Promise.all([findingLocal, findingGlobal]).then(([pluginNames, globalPluginNames]) => {
    const commands = activatePlugins(pluginNames, cwd)

    globalPluginNames.forEach(p => {
      if (pluginNames.indexOf(p) !== -1)
        return
      const m = loadModule(p, globalFolder)
      if (isValidPlugin(m))
        commands.push(...activatePlugin(m))
    })

    return commands
  })
}

function getGlobalPackageFolder(folder: string): string {
  const indexToFirstNodeModulesFolder = folder.indexOf('node_modules')
  const basePath = indexToFirstNodeModulesFolder === -1 ? folder : folder.slice(0, indexToFirstNodeModulesFolder)
  // in NodeJS@6 the following fails tsc due to null is not assignable to string.
  // in this context the `findup()` call should not fail and will not return null.
  return path.resolve(findup.sync('node_modules', { cwd: basePath, type: 'directory' })!, '..')
}

function activatePlugins(pluginNames: string[], cwd: string) {
  const commands: CliCommand[] = []
  pluginNames
    .map(p => {
      return {
        name: p,
        pluginModule: loadModule(p, cwd),
      }
    })
    .filter(({ name, pluginModule }) => {
      if (!isValidPlugin(pluginModule)) {
        log.debug('not a valid plugin', name)
        return false
      }
      return true
    })
    .forEach(({ name, pluginModule }) => {
      log.debug('activating plugin', name)
      commands.push(...activatePlugin(pluginModule))
      log.debug('activated plugin', name)
    })
  return commands
}

function loadModule(name: string, cwd: string) {
  const pluginPath = path.resolve(cwd, 'node_modules', name)
  return require(pluginPath)
}

function isValidPlugin(m: any) {
  return typeof m.activate === 'function'
}

function activatePlugin(m: { activate: (context: ActivationContext) => void }) {
  const commands: CliCommand[] = []
  m.activate({ addCommand: cmd => commands.push(cmd) })
  return commands
}
