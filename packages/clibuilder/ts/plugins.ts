import type { cli, PluginActivationContext } from './cli.js'
import type { RegistryOwner } from './registry.js'
import type { createUI } from './ui.js'

export async function loadPlugins(
	{
		cwd,
		ui,
		registry,
		host
	}: { cwd: string; ui: createUI.UI; registry: RegistryOwner; host: PluginActivationContext['host'] },
	pluginNames: string[]
) {
	return activatePlugins(cwd, ui, registry, host, pluginNames)
}

async function activatePlugins(
	cwd: string,
	ui: createUI.UI,
	registry: RegistryOwner,
	host: PluginActivationContext['host'],
	pluginNames: string[]
) {
	const entries = await Promise.all(
		pluginNames.map(async (name) => {
			ui.debug('loading plugin', name)
			const pluginModule = await loadModule(cwd, ui, name)
			return { name, pluginModule }
		})
	)

	const commands: cli.Command<any, any>[] = []
	for (const { name, pluginModule } of entries) {
		// ignoring coverage. Test are done through `@unional/fixture` `execCommand()`
		// istanbul ignore next
		if (!isValidPlugin(pluginModule)) {
			ui.warn('not a valid plugin', name)
			continue
		}
		ui.debug('activating plugin', name)
		const pluginCommands = await activatePlugin(pluginModule, registry, host, name, ui)
		pluginCommands.forEach((cmd) => {
			ui.debug('adding command', cmd.name)
			commands.push(cmd)
		})
		ui.debug('activated plugin', name)
	}
	return commands
}

// ignoring coverage. Test are done through `@unional/fixture` `execCommand()`
// istanbul ignore next
async function loadModule(cwd: string, ui: createUI.UI, name: string) {
	try {
		return await import(name)
	} catch (e: any) {
		ui.warn(`Unable to load plugin from ${name}. Please let the plugin author knows about it.`)
		ui.warn(`cwd: ${cwd}`)
		ui.warn('error: ', e.message || e)
		return undefined
	}
}

function isValidPlugin(m: any) {
	return m && typeof m.activate === 'function'
}

async function activatePlugin(
	m: { activate: (context: PluginActivationContext) => void | Promise<void> },
	registry: RegistryOwner,
	host: PluginActivationContext['host'],
	source: string,
	ui: createUI.UI
) {
	const commands: cli.Command[] = []
	await m.activate({
		addCommand: (cmd) => commands.push(cmd),
		register: (key, value) => {
			const registration = registry.register(source, key, value)
			if (!registration.accepted) {
				ui.warn(`plugin ${source} could not register ${key.id}; it is already registered by ${registration.source}`)
			}
		},
		get: registry.get,
		has: registry.has,
		host
	})
	return commands
}
