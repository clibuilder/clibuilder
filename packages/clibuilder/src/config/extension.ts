import { CliError } from '../app/errors.js'
import type { ConfigExtension, cli, ExtensionContext } from '../cli.js'
import { type ConfigLoadResult, type ConfigSource, describeConfigSource } from '../config.js'
import { result } from '../render/answer.js'
import { describeInvalidConfig } from '../render/usage_error.js'
import { type StandardSchemaV1, t } from '../t.js'
import { configKey } from './key.js'

export namespace configExtension {
	export type Options = {
		/**
		 * Add the global `--show-config` option.
		 */
		showConfig: boolean
	}
}

/**
 * The extension behind `config()`: it loads the config with `load`, shares it with the other extensions,
 * offers `--show-config`, and validates the matched command's `config` schema before `run()`.
 * A command without a schema reads the config as loaded.
 *
 * `testCommand()` uses it with a config given in code.
 */
export function configExtension(
	load: (context: ExtensionContext) => Promise<ConfigLoadResult>,
	options: configExtension.Options
): ConfigExtension {
	return (async (context: ExtensionContext) => {
		const loaded = await load(context)
		context.shared.set(configKey, loaded)
		if (options.showConfig) {
			context.addGlobalOption(
				'show-config',
				{
					type: t.boolean().optional(),
					description: 'Print the resolved config and where it was loaded from'
				},
				({ output, ui }) => showConfig(loaded, output, ui)
			)
		}
		context.beforeRun(async (run) => {
			// a command without a schema reads the config as loaded
			if (!run.command.config) {
				run.config = loaded.config
				return
			}
			const { config, errors } = await parseConfig(run.command.config, loaded.config)
			if (!errors) {
				run.config = config
				return
			}
			if (run.output === 'axi') {
				const { message, code, details } = describeInvalidConfig(errors)
				throw new CliError({ message, code, details: details as CliError.Details })
			}
			run.ui.error('config fails validation:')
			for (const k of Object.keys(errors)) run.ui.error(`  ${k}: ${errors[k]}`)
			run.ui.showHelp()
			throw CliError.reported()
		})
	}) as ConfigExtension
}

/**
 * Reports the resolved config and its provenance.
 *
 * In `axi` output it is the answer: `text` is the `console` rendering,
 * and `toon` and `json` encode the source and the config.
 * In `console` output it is written through `ui.info`.
 */
function showConfig({ config, source }: ConfigLoadResult, output: cli.Output, ui: { info(...args: any[]): void }) {
	const lines = [`config: ${describeConfigSource(source)}`]
	if (source.type !== 'none') lines.push(JSON.stringify(config, undefined, 2))
	if (output === 'axi') return result(configReport(source, config), { render: { text: () => lines.join('\n') } })
	for (const line of lines) ui.info(line)
	return undefined
}

/**
 * Validates the loaded config against the command's `config` schema.
 *
 * The schema's output is what the command gets, so its defaults and transforms apply.
 * A failure is reported as the messages for each config key.
 *
 * With no config, a schema that rejects `undefined` validates `{}` instead,
 * so a schema whose keys all have defaults passes, and one with a required key names that key.
 */
async function parseConfig(
	schema: cli.ConfigSchema,
	config: unknown
): Promise<{ config: unknown; errors?: undefined } | { config?: undefined; errors: ConfigErrors }> {
	let r = await schema['~standard'].validate(config)
	if (r.issues && config === undefined) r = await schema['~standard'].validate({})
	if (!r.issues) return { config: r.value }
	return { errors: toConfigErrors(r.issues) }
}

/**
 * The messages for each config key, keyed by the dotted path of the value that failed.
 */
type ConfigErrors = Record<string, string[] | undefined>

/**
 * Maps a Standard Schema's issues to the messages for each key, with the key read from each issue's path.
 * An issue without a path is about the config as a whole and is keyed `(config)`.
 */
function toConfigErrors(issues: readonly StandardSchemaV1.Issue[]): ConfigErrors {
	const errors: ConfigErrors = {}
	for (const issue of issues) {
		const key = issue.path?.length
			? issue.path.map((p) => String(typeof p === 'object' ? p.key : p)).join('.')
			: '(config)'
		;(errors[key] ??= []).push(String(issue.message))
	}
	return errors
}

/**
 * The resolved config as a value: where it came from, then the config itself.
 * `path` and `property` are present only for the sources that have them,
 * and `config` is `null` when nothing matched.
 */
function configReport(source: ConfigSource, config: unknown) {
	switch (source.type) {
		case 'file':
			return { source: source.type, path: source.path, config: config ?? null }
		case 'package.json':
			return { source: source.type, path: source.path, property: source.property, config: config ?? null }
		default:
			return { source: source.type, config: null }
	}
}
