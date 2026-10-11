import type { BeforeRunHook, cli, ExtensionContext, GlobalOptionAnswer } from '../cli.js'
import { mockContext } from '../drivers/context.mock.js'
import { createRegistry, type RegistryOwner } from '../plugins/registry.js'

export namespace mockExtensionContext {
	export type Options = {
		/** The directory the extension sees as `cwd`. Default a fresh temporary directory. */
		cwd?: string
		/** The host cli. Default `{ name: 'test-cli', version: '1.0.0' }`. */
		host?: ExtensionContext['host']
		/** A registry to register into, to share it with other extensions under test. */
		registry?: RegistryOwner
		/** What `resolveConfig()` returns as the cli's config. Default no config. */
		config?: unknown
	}

	export type GlobalOption = {
		name: string
		entry: cli.Command.Options.Entry
		answer: GlobalOptionAnswer
	}
}

/**
 * Builds the `ExtensionContext` an extension takes, and captures what it adds.
 *
 * `messages` holds what the extension wrote through `context.ui`, one line per message.
 */
export function mockExtensionContext(options: mockExtensionContext.Options = {}) {
	const ctx = mockContext()
	ctx.ui.dump()
	const cwd = options.cwd ?? ctx.cwd
	const registry = options.registry ?? createRegistry()
	const commands: cli.Command<any, any, any, any>[] = []
	const globalOptions: mockExtensionContext.GlobalOption[] = []
	const beforeRunHooks: BeforeRunHook[] = []
	const values = new Map<string, unknown>()
	const shared: ExtensionContext['shared'] = {
		get: (key) => values.get(key.id) as any,
		set(key, value) {
			values.set(key.id, value)
		},
		has: (key) => values.has(key.id)
	}
	const context: ExtensionContext = {
		host: options.host ?? { name: 'test-cli', version: '1.0.0' },
		cwd,
		ui: {
			get displayLevel() {
				return ctx.ui.displayLevel
			},
			set displayLevel(level) {
				ctx.ui.displayLevel = level
			},
			info: (...args) => ctx.ui.info(...args),
			warn: (...args) => ctx.ui.warn(...args),
			error: (...args) => ctx.ui.error(...args),
			debug: (...args) => ctx.ui.debug(...args),
			showHelp() {},
			showVersion() {}
		},
		registry,
		shared,
		addCommand(command) {
			commands.push(command)
		},
		addGlobalOption(name, entry, answer) {
			globalOptions.push({ name, entry, answer })
		},
		beforeRun(hook) {
			beforeRunHooks.push(hook)
		},
		resolveConfig: async () =>
			options.config === undefined
				? { config: undefined, source: { type: 'none' }, candidates: [] }
				: {
						config: options.config,
						source: { type: 'file', path: `${cwd}/.test-clirc.json`, format: 'jsonc' },
						candidates: []
					}
	}
	return {
		context,
		commands,
		globalOptions,
		beforeRunHooks,
		shared,
		registry,
		get messages() {
			return ctx.messages
		}
	}
}
