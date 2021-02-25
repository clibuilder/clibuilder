import { findByKeywords } from 'find-installed-packages'
import findUp from 'find-up'
import path from 'path'
import { Logger } from 'standard-log'
import type { cli, PluginActivationContext } from './cli'

export async function loadPlugins({ cwd, log }: { cwd: string, log: Logger }, keyword: string) {
  log.debug(`look up local plugins with keyword '${keyword}' at ${cwd}`)
  const findingLocal = findByKeywords([keyword], { cwd }).then(pluginNames => {
    log.debug('found local plugins', pluginNames)
    return pluginNames
  })

  const globalFolder = getGlobalPackageFolder(__dirname)
  log.debug(`look up global plugins with keyword '${keyword}' at ${globalFolder}`)
  const findingGlobal = findByKeywords([keyword], { cwd: globalFolder }).then(globalPluginNames => {
    log.debug('found global plugins', globalPluginNames)
    return globalPluginNames
  })

  return Promise.all([findingLocal, findingGlobal]).then(([localPluginsNames, globalPluginNames]) => {
    const commands = activatePlugins(cwd, log, localPluginsNames)

    globalPluginNames.forEach(p => {
      if (localPluginsNames.indexOf(p) !== -1)
        return
      const m = loadModule(globalFolder, log, p)
      if (isValidPlugin(m)) commands.push(...activatePlugin(m))
    })

    return commands
  })
}

function getGlobalPackageFolder(folder: string): string {
  const indexToFirstNodeModulesFolder = folder.indexOf('node_modules')
  const basePath = indexToFirstNodeModulesFolder === -1 ? folder : folder.slice(0, indexToFirstNodeModulesFolder)
  // in NodeJS@6 the following fails tsc due to null is not assignable to string.
  // in this context the `findUp()` call should not fail and will not return null.
  return path.resolve(findUp.sync('node_modules', { cwd: basePath, type: 'directory' })!, '..')
}

function activatePlugins(cwd: string, log: Logger, pluginNames: string[]) {
  const commands: cli.Command<any, any>[] = []
  pluginNames
    .map(p => ({
      name: p,
      pluginModule: loadModule(cwd, log, p),
    }))
    .filter(({ name, pluginModule }) => {
      if (!isValidPlugin(pluginModule)) {
        log.debug('not a valid plugin', name)
        return false
      }
      return true
    })
    .forEach(({ name, pluginModule }) => {
      log.debug('activating plugin', name)
      activatePlugin(pluginModule).forEach(cmd => {
        log.debug('adding command', cmd.name)
        commands.push(cmd)
      })
      log.debug('activated plugin', name)
    })
  return commands
}

function loadModule(cwd: string, log: Logger, name: string) {
  const pluginPath = path.resolve(cwd, 'node_modules', name)
  try {
    return require(pluginPath)
  }
  catch (e) {
    log.warn(`Unable to load plugin from ${name}. Please let the plugin author knows about it.`)
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
