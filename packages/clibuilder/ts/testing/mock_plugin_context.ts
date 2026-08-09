import type { cli, PluginActivationContext } from '../cli.js'
import { createRegistry, type RegistryOwner } from '../registry.js'

export namespace mockPluginContext {
	export type Params = {
		source?: string
		host?: PluginActivationContext['host']
		registry?: RegistryOwner
	}
}

export function mockPluginContext(params: mockPluginContext.Params = {}) {
	const commands: cli.Command[] = []
	const registry = params.registry ?? createRegistry()
	const source = params.source ?? 'test-plugin'
	const host = params.host ?? { name: 'test-cli', version: '1.0.0' }
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
