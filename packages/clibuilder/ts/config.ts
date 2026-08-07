import { readFileSync } from 'node:fs'
import { extname } from 'node:path'
import { pathToFileURL } from 'node:url'
import yaml from 'js-yaml'
import { type ParseError, parse as parseJsonc, printParseErrorCode } from 'jsonc-parser'
import type { UI } from './cli.js'
import { findAnyFileUp } from './find_up.js'
import { findPackageJson, getPackageJson } from './platform.js'

export const ctx = {
	findPackageJson,
	getPackageJson
}

/**
 * How a config file's content is parsed.
 *
 * - `jsonc`: JSON with comments and trailing commas (`.json`, `.jsonc`).
 * - `yaml`: `.yml` / `.yaml`.
 * - `module`: `.js` / `.cjs` / `.mjs`, loaded through `import()`.
 * - `unknown`: an extension-less candidate such as `.<name>rc`,
 *   whose content decides the format.
 */
export type ConfigFormat = 'jsonc' | 'yaml' | 'module' | 'unknown'

/**
 * Where a config value came from.
 *
 * `type: 'none'` means nothing matched, which is distinct from a config file
 * that exists and holds `undefined`.
 */
export type ConfigSource =
	| { type: 'file'; path: string; format: ConfigFormat }
	| { type: 'package.json'; path: string; property: string }
	| { type: 'none' }

export type ConfigLookupResult = {
	source: ConfigSource
	/**
	 * The file names searched for, in priority order, at every directory
	 * from `cwd` up to the filesystem root.
	 */
	candidates: string[]
}

export type ConfigLoadResult = ConfigLookupResult & { config: any }

/**
 * Finds where the config for `configName` would be read from, without reading it.
 *
 * Prefers a config file in the nearest ancestor directory. Falls back to the
 * `configName` property of the nearest `package.json`, and reports
 * `{ type: 'none' }` when neither exists.
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

/**
 * Loads the config for `configName` along with where it came from.
 *
 * This is the provenance-carrying form of {@link loadConfig}; use it when the
 * caller needs to report or act on the origin of the config, not just its value.
 */
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
	ui.warn(`no config found under '${cwd}':\n  ${candidates.join('\n  ')}`)
	return { config: undefined, source, candidates }
}

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

/**
 * Renders a {@link ConfigSource} as a single human-readable line.
 */
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
 * Reads and parses a single config file, dispatching on its extension.
 *
 * An extension-less file has its format inferred from its content, trying the
 * same order the candidate list implies: JSON(C), then YAML, then module.
 */
export async function readConfigFile(configFilePath: string) {
	const format = getConfigFormat(configFilePath)
	if (format === 'module') return readModuleConfig(configFilePath)

	const content = readFileSync(configFilePath, 'utf-8')
	if (format === 'jsonc') return parseJsoncOrThrow(content, configFilePath)
	if (format === 'yaml') return yaml.load(content)

	try {
		return parseJsoncOrThrow(content, configFilePath)
	} catch {
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
	const m = await import(pathToFileURL(configFilePath).href)
	if (m.activate) return m
	return m.default
}

/**
 * `jsonc-parser` recovers from syntax errors instead of throwing — a JS module
 * parses to `{}` and a YAML list to its first scalar. The `errors` array is the
 * only reliable signal, so a non-empty one has to become a throw for the
 * format-inference fallback above to work.
 */
function parseJsoncOrThrow(content: string, configFilePath: string) {
	const errors: ParseError[] = []
	const value = parseJsonc(content, errors, { allowTrailingComma: true, disallowComments: false })
	if (errors.length > 0) {
		const [{ error, offset }] = errors
		throw new Error(`Unable to parse ${configFilePath} as JSON: ${printParseErrorCode(error)} at offset ${offset}`)
	}
	return value
}
