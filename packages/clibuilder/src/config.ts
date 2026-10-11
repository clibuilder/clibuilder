import { extname } from 'node:path'
import type { UI } from './core/ports.js'
import { findAnyFileUp } from './drivers/find_up.js'
import { findPackageJson, getPackageJson } from './drivers/package_json.js'
import { importModule, readTextFile } from './drivers/read_file.js'
import { loadYaml } from './drivers/yaml.js'
import { stripJsonc } from './strip_jsonc.js'

export const ctx = {
	findPackageJson,
	getPackageJson
}

/**
 * How a config file's content is parsed: `jsonc` (`.json`, `.jsonc`), `yaml`, `module` (loaded through `import()`),
 * or `unknown` for an extension-less candidate such as `.<name>rc`, whose content decides.
 */
export type ConfigFormat = 'jsonc' | 'yaml' | 'module' | 'unknown'

/** Where a config value came from. `none` means nothing matched, not a file that holds `undefined`. */
export type ConfigSource =
	| { type: 'file'; path: string; format: ConfigFormat }
	| { type: 'package.json'; path: string; property: string }
	| { type: 'none' }

export type ConfigLookupResult = {
	source: ConfigSource
	/** The file names searched for, in priority order, at every directory from `cwd` up to the root. */
	candidates: string[]
}

export type ConfigLoadResult = ConfigLookupResult & { config: any }

/**
 * Finds where the config for `configName` would be read from, without reading it:
 * a config file in the nearest ancestor directory, else the `configName` property of the nearest `package.json`.
 */
export function lookupConfig({ cwd }: { cwd: string }, configName: string): ConfigLookupResult {
	const candidates = getConfigFilenames(configName)
	const path = findAnyFileUp(cwd, candidates)
	if (path) return { source: { type: 'file', path, format: getConfigFormat(path) }, candidates }

	const pjsonPath = ctx.findPackageJson(cwd)
	if (pjsonPath) {
		const pjson = ctx.getPackageJson(pjsonPath)
		if (pjson[configName]) {
			return { source: { type: 'package.json', path: pjsonPath, property: configName }, candidates }
		}
	}
	return { source: { type: 'none' }, candidates }
}

/** Loads the config for `configName` along with where it came from. */
export async function resolveConfig(
	{
		cwd,
		ui
	}: {
		cwd: string
		ui: Pick<UI, 'info' | 'debug' | 'warn'>
	},
	configName: string
): Promise<ConfigLoadResult> {
	const { source, candidates } = lookupConfig({ cwd }, configName)
	if (source.type === 'file') {
		ui.debug(`load config from: ${source.path}`)
		const config = await readConfigFile(source.path)
		ui.debug(`config: ${JSON.stringify(config, undefined, 2)}`)
		return { config, source, candidates }
	}
	if (source.type === 'package.json') {
		ui.debug(`load config from package.json: ${source.path}`)
		const pjson = ctx.getPackageJson(source.path)
		const config = pjson[source.property]
		ui.debug(`config: ${JSON.stringify(config, undefined, 2)}`)
		return { config, source, candidates }
	}
	// a debug message, shown under `--verbose` and `--debug-cli`: a cli without a config file is normal, not a warning
	ui.debug(`no config found under '${cwd}':\n  ${candidates.join('\n  ')}`)
	return { config: undefined, source, candidates }
}

/**
 * Loads the config for `configName`: its value, or `undefined` when none is found.
 * Use {@link resolveConfig} to also get where it came from.
 */
export async function loadConfig(
	{
		cwd,
		ui
	}: {
		cwd: string
		ui: Pick<UI, 'info' | 'debug' | 'warn'>
	},
	configName: string
) {
	return (await resolveConfig({ cwd, ui }, configName)).config
}

/** Renders a {@link ConfigSource} as a single human-readable line. */
export function describeConfigSource(source: ConfigSource) {
	switch (source.type) {
		case 'file':
			return source.path
		case 'package.json':
			return `${source.path} (property "${source.property}")`
		default:
			return 'not found'
	}
}

/**
 * The file names searched for `configFileName`, in priority order.
 * Each also has a dot-prefixed form unless the name already starts with a dot.
 */
export function getConfigFilenames(configFileName: string) {
	const names = [
		configFileName,
		`${configFileName}.cjs`,
		`${configFileName}.mjs`,
		`${configFileName}.js`,
		`${configFileName}.json`,
		`${configFileName}.jsonc`,
		`${configFileName}.yml`,
		`${configFileName}.yaml`,
		`${configFileName}rc.cjs`,
		`${configFileName}rc.mjs`,
		`${configFileName}rc.js`,
		`${configFileName}rc.json`,
		`${configFileName}rc.jsonc`,
		`${configFileName}rc.yml`,
		`${configFileName}rc.yaml`,
		`${configFileName}rc`
	]
	return configFileName.startsWith('.') ? names : names.flatMap((n) => [n, `.${n}`])
}

/** The {@link ConfigFormat} for a config file path, from its extension. */
export function getConfigFormat(configFilePath: string): ConfigFormat {
	switch (extname(configFilePath).toLowerCase()) {
		case '.json':
		case '.jsonc':
			return 'jsonc'
		case '.yml':
		case '.yaml':
			return 'yaml'
		case '.js':
		case '.cjs':
		case '.mjs':
			return 'module'
		default:
			// extension-less candidates such as `.<name>rc` carry no format hint
			return 'unknown'
	}
}

/**
 * Reads and parses a config file by its extension.
 * An extension-less file is tried as JSON(C), then YAML, then module.
 */
export async function readConfigFile(configFilePath: string) {
	const format = getConfigFormat(configFilePath)
	if (format === 'module') return readModuleConfig(configFilePath)

	const content = readTextFile(configFilePath)
	if (format === 'jsonc') return parseJsoncOrThrow(content, configFilePath)
	if (format === 'yaml') return (await loadYaml()).load(content)

	try {
		return parseJsoncOrThrow(content, configFilePath)
	} catch {
		const yaml = await loadYaml()
		try {
			return yaml.load(content)
		} catch {
			// ignoring coverage. An extension-less module config cannot be `import()`ed by name,
			// so this is only reachable for a file `node` can already resolve.
			// istanbul ignore next
			return readModuleConfig(configFilePath)
		}
	}
}

// ignoring coverage. Test are done through `@unional/fixture` `execCommand()`
// istanbul ignore next
async function readModuleConfig(configFilePath: string) {
	const m = await importModule(configFilePath)
	if (m.activate) return m
	return m.default
}

// throws on a JS module or a YAML list, which the format-inference fallback relies on
function parseJsoncOrThrow(content: string, configFilePath: string) {
	try {
		return JSON.parse(stripJsonc(content))
	} catch (e) {
		throw new Error(`Unable to parse ${configFilePath} as JSON: ${(e as Error).message}`)
	}
}
