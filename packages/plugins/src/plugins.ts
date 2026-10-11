import type { Extension } from 'clibuilder'
import { pluginsCommand } from './commands/group.js'
import { findDependencyPlugins } from './dependencies.js'
import { loadPlugins } from './load.js'

export namespace plugins {
	export type Options = {
		/**
		 * The npm keywords `plugins list` and `plugins search` look for,
		 * and that the `dependencies` source matches.
		 *
		 * Defaults to the cli's name, as `clibuilder` 11 does.
		 */
		keywords?: string[]
		/**
		 * Plugin packages the cli author ships with the cli.
		 * They load without any user config.
		 */
		include?: string[]
		/**
		 * Load the direct dependencies of the project in `cwd` that carry one of `keywords`.
		 *
		 * Opt-in: a dependency that adds the keyword in a later version
		 * starts adding commands without the user doing anything.
		 */
		dependencies?: boolean
		/**
		 * Read the `plugins` key from the config `.use(config())` from `clibuilder/config` resolved.
		 * Add `config()` before `plugins()`.
		 * An entry starting with `!` excludes that package from the other sources.
		 */
		config?: boolean
		/**
		 * Add the `plugins list` and `plugins search` commands.
		 */
		command?: boolean
	}
}

/**
 * Loads plugins and adds the `plugins` command group to a cli, through `cli().use()`.
 *
 * Plugins load in the order `include`, then `dependencies`, then config.
 * A package named by more than one source loads once, at its first position.
 *
 * @example
 * cli({ name: 'my-cli', version: '1.0.0' })
 *   .use(config())
 *   .use(plugins({ keywords: ['my-cli-plugin'] }))
 *   .parse(process.argv)
 */
export function plugins(options: plugins.Options = {}): Extension {
	const { include = [], dependencies = false, config = true, command = true } = options
	return async (context) => {
		const keywords = options.keywords ?? [context.host.name]
		if (command) context.addCommand(pluginsCommand({ keywords }))

		const fromDependencies = dependencies ? await findDependencyPlugins(context.cwd, keywords) : []
		const fromConfig = config ? readConfigEntries((await context.resolveConfig()).config) : []
		const excluded = new Set(fromConfig.filter((e) => e.startsWith('!')).map((e) => e.slice(1)))
		const names = [
			...new Set([...include, ...fromDependencies, ...fromConfig.filter((e) => !e.startsWith('!'))])
		].filter((name) => !excluded.has(name))
		if (names.length === 0) return

		const commands = await loadPlugins(context, names)
		for (const c of commands) context.addCommand(c)
	}
}

function readConfigEntries(config: any): string[] {
	const entries = config?.plugins
	return Array.isArray(entries) ? entries.filter((e): e is string => typeof e === 'string') : []
}
