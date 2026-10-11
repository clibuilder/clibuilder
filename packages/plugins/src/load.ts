import type { cli, RegistryOwner, UI } from 'clibuilder'
import { resolvePlugin } from './resolve_plugin.js'
import type { PluginActivationContext } from './types.js'

export namespace loadPlugins {
	export type Context = {
		cwd: string
		ui: Pick<UI, 'debug' | 'warn'>
		registry: RegistryOwner
		host: PluginActivationContext['host']
	}
}

/**
 * Imports the named plugin packages from `cwd` and activates them,
 * returning the commands they add, in the order the plugins were named.
 *
 * The modules are imported concurrently, but activated one at a time,
 * so the command order is the same on every run.
 * A package that fails to import, or exports no `activate`, is reported and skipped.
 */
export async function loadPlugins(
	{ cwd, ui, registry, host }: loadPlugins.Context,
	pluginNames: string[]
): Promise<cli.Command[]> {
	const entries = await Promise.all(
		pluginNames.map(async (name) => {
			ui.debug('loading plugin', name)
			const pluginModule = await loadModule(cwd, ui, name)
			return { name, pluginModule }
		})
	)

	const commands: cli.Command[] = []
	for (const { name, pluginModule } of entries) {
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

async function loadModule(cwd: string, ui: loadPlugins.Context['ui'], name: string) {
	try {
		return await import(resolvePlugin(cwd, name))
	} catch (e: any) {
		ui.warn(`Unable to load plugin from ${name}. Please let the plugin author know about it.`)
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
	ui: loadPlugins.Context['ui']
) {
	const commands: cli.Command[] = []
	await m.activate({
		addCommand: (cmd) => commands.push(cmd as cli.Command),
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
