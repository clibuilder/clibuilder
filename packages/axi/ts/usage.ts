import { type cli, exitCodes } from 'clibuilder'
import type { ErrorReport } from './error.js'
import type { OutputFormat } from './format.js'
import { type OutputWriter, writeError } from './output.js'

function optionName(key: string) {
	return key.length === 1 ? `-${key}` : `--${key}`
}

function keyName(key: string, command: cli.Command) {
	return command.arguments?.some((a) => a.name === key) ? `argument <${key}>` : `option ${optionName(key)}`
}

function argumentsHelp(command: cli.Command) {
	const args = (command.arguments ?? []).map((a) => (a.type?.isOptional() ? `[${a.name}]` : `<${a.name}>`))
	return args.length > 0 ? `\`${command.name}\` takes: ${args.join(' ')}` : `\`${command.name}\` takes no arguments`
}

function optionsHelp(command: cli.Command) {
	const options = Object.keys(command.options ?? {}).map(optionName)
	return options.length > 0
		? `valid options for \`${command.name}\`: ${options.join(', ')} (--help always allowed)`
		: `\`${command.name}\` takes no options (--help always allowed)`
}

// The error an agent should fix first leads: a mistyped option usually explains the rest, such as
// a value it swallowed being reported as a missing argument.
const rank: Record<cli.UsageError['type'], number> = {
	'invalid-key': 0,
	'conflicting-options': 1,
	'invalid-value': 2,
	'expect-single': 2,
	'missing-argument': 3,
	'extra-arguments': 3
}

/**
 * One usage error as an agent reads it: a kebab-case `code`, the message in the caller's terms, and,
 * where a list of what is valid fixes it, that list as `help`.
 */
export function describeUsageError(
	error: cli.UsageError,
	command: cli.Command
): Required<Pick<ErrorReport, 'code' | 'message'>> & { help: string[] } {
	switch (error.type) {
		case 'invalid-key':
			return {
				code: 'unknown-option',
				message: `unknown option ${optionName(error.key)}`,
				help: [optionsHelp(command)]
			}
		case 'missing-argument':
			return {
				code: 'missing-argument',
				message: `missing required argument <${error.name}>`,
				help: [argumentsHelp(command)]
			}
		case 'extra-arguments':
			return {
				code: 'unexpected-argument',
				message: `unexpected argument${error.values.length > 1 ? 's' : ''}: ${error.values.join(', ')}`,
				help: [argumentsHelp(command)]
			}
		case 'invalid-value':
			return {
				code: 'invalid-value',
				message: `invalid value for ${keyName(error.key, command)}: ${error.message}, received "${error.value}"`,
				help: []
			}
		case 'conflicting-options':
			return {
				code: 'conflicting-options',
				message: `option ${optionName(error.key)} cannot be used with option ${optionName(error.conflictsWith)}`,
				help: []
			}
		case 'expect-single':
			return {
				code: 'expect-single',
				message: `${keyName(error.key, command)} expects a single value, received: ${(Array.isArray(error.value) ? error.value : [error.value]).join(', ')}`,
				help: []
			}
	}
}

/**
 * Reports usage errors the AXI way: one structured error on stdout, where the agent reads its
 * answers, naming what was wrong and listing what is valid, with exit code 2 — instead of
 * clibuilder's default of messages and the full help on stderr. When there are several, they are
 * reported as one, and an unknown option leads and codes it.
 *
 * Pass it as `onUsageError`, to `cli()` for every command or to one command for its own:
 *
 * @example
 * ```ts
 * cli({ name: 'my-cli', version, onUsageError: createUsageErrorHandler() })
 * ```
 *
 * ```sh
 * $ my-cli list --stat open
 * error: unknown option --stat
 * code: unknown-option
 * help[1]: "valid options for `list`: --format, --state (--help always allowed)"
 * ```
 *
 * Usage errors are found before the command's options are parsed, so the handler cannot read
 * `--format`; it writes in `format`, `toon` unless told otherwise.
 */
export function createUsageErrorHandler(
	options: { format?: OutputFormat | undefined; stdout?: OutputWriter | undefined } = {}
): cli.UsageErrorHandler {
	return (errors, { command }) => {
		const described = [...errors].sort((a, b) => rank[a.type] - rank[b.type]).map((e) => describeUsageError(e, command))
		const first = described[0]
		if (!first) return exitCodes.usage
		return writeError(
			{
				code: first.code,
				message: described.map((d) => d.message).join('; '),
				help: [...new Set(described.flatMap((d) => d.help))],
				exitCode: exitCodes.usage
			},
			options.format ?? 'toon',
			options.stdout
		)
	}
}
