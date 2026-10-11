import type { cli, PluginActivationContext } from '../cli.js'
import { createRegistry, type RegistryOwner } from '../plugins/registry.js'

export namespace mockPluginContext {
	export type Options = {
		/** The source recorded for values the plugin registers. Default `'test-plugin'`. */
		source?: string
		/** The host cli. Default `{ name: 'test-cli', version: '1.0.0' }`. */
		host?: PluginActivationContext['host']
		/** A registry to register into, to share it with other plugins under test. */
		registry?: RegistryOwner
	}

	/** @deprecated Use `mockPluginContext.Options`. Removed in clibuilder 13. */
	export type Params = Options
}

/**
 * Builds the `PluginActivationContext` a plugin's `activate()` takes, and captures what it adds.
 *
 * The host defaults to `{ name: 'test-cli', version: '1.0.0' }`.
 *
 * @deprecated Use `mockExtensionContext()`. Removed in clibuilder 13.
 */
export function mockPluginContext(options: mockPluginContext.Options = {}) {
	const commands: cli.Command[] = []
	const registry = options.registry ?? createRegistry()
	const source = options.source ?? 'test-plugin'
	const host = options.host ?? { name: 'test-cli', version: '1.0.0' }
	const context: PluginActivationContext = {
		addCommand(command) {
			commands.push(command)
		},
		register(key, value) {
			registry.register(source, key, value)
		},
		get: registry.get,
		has: registry.has,
		host
	}
	return { commands, context, registry }
}
