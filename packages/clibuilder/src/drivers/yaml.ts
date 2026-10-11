import { CliError } from '../app/errors.js'

export type YamlParser = { load(content: string): unknown }

/**
 * Loads `js-yaml`, an optional peer dependency, when a YAML config file is read.
 *
 * @param importer imports `js-yaml`. Tests pass their own.
 * @throws CliError with code `missing-peer-dependency` when `js-yaml` is not installed.
 */
export async function loadYaml(importer: () => Promise<unknown> = () => import('js-yaml')): Promise<YamlParser> {
	try {
		const m = (await importer()) as YamlParser & { default?: YamlParser }
		return m.default ?? m
	} catch (e) {
		if (!isMissing(e)) throw e
		throw new CliError('reading a YAML config file needs js-yaml, which is not installed', {
			code: 'missing-peer-dependency',
			details: { package: 'js-yaml' },
			help: 'install it next to the cli: npm install js-yaml',
			cause: e
		})
	}
}

function isMissing(e: unknown) {
	const code = (e as { code?: unknown } | undefined)?.code
	return (
		(code === 'ERR_MODULE_NOT_FOUND' || code === 'MODULE_NOT_FOUND') && String((e as Error).message).includes('js-yaml')
	)
}
