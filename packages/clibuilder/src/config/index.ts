import type { ConfigExtension } from '../cli.js'
import { resolveConfig } from '../config.js'
import { configExtension } from './extension.js'

export {
	type ConfigFormat,
	type ConfigLoadResult,
	type ConfigLookupResult,
	type ConfigSource,
	describeConfigSource,
	getConfigFilenames,
	getConfigFormat,
	loadConfig,
	lookupConfig,
	readConfigFile,
	resolveConfig
} from '../config.js'

export namespace config {
	export type Options = {
		/**
		 * The name the config files (`<name>.json`, `.<name>rc`) and the `package.json` property are looked up by.
		 * Defaults to the cli's name.
		 */
		name?: string | undefined
	}
}

/**
 * Loads the cli's config, through `cli().use()`.
 *
 * The config is resolved once, on the first `parse()` that needs the command tree.
 * Each command's `config` schema validates it before `run()`, which reads the schema's output as `this.config`.
 * The cli gets the global `--show-config` option, and other extensions, such as `plugins()`
 * from `@clibuilder/plugins`, read the config through `context.resolveConfig()`:
 * add `.use(config())` before them.
 *
 * @example
 * import { cli } from 'clibuilder'
 * import { config } from 'clibuilder/config'
 *
 * cli({ name: 'my-cli', version: '1.0.0' })
 *   .use(config())
 *   .command({ name: 'serve', config: schema, run() { return this.config.port } })
 *   .parse(process.argv)
 */
export function config(options: config.Options = {}): ConfigExtension {
	return configExtension(
		(context) => resolveConfig({ cwd: context.cwd, ui: context.ui }, options.name ?? context.host.name),
		{ showConfig: true }
	)
}
