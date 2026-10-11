import type { cli } from '../cli.js'
import type { parseArgv } from '../invocation/argv.js'
import { lookupCommand, lookupOptions } from '../invocation/lookup.js'

/**
 * The global options, resolved from the base command's lookup alone.
 *
 * They are read before the matched command's usage errors are looked at,
 * so the logging flags apply and `onUsageError` knows the format it reports in.
 */
export type GlobalOptions = {
	help?: boolean | undefined
	version?: boolean | undefined
	verbose?: boolean | undefined
	silent?: boolean | undefined
	'debug-cli'?: boolean | undefined
	'show-config'?: boolean | undefined
	format: cli.Format
	/**
	 * The base lookup's errors on its own options: a malformed or repeated global flag.
	 * They are the only errors reported for a global key (see `resolveUsageErrors()`).
	 */
	errors: lookupCommand.Error[]
}

/**
 * Looks the invocation up on the base command, the single source of truth for the global options.
 *
 * @param format the cli's resolved default format. There is no `--format` flag yet.
 */
export function resolveGlobalOptions(
	baseCommand: cli.Command,
	rawArgs: parseArgv.Result,
	format: cli.Format
): GlobalOptions {
	const { args, errors } = lookupCommand(baseCommand, rawArgs)
	return {
		help: args.help as any,
		version: args.version as any,
		verbose: args.verbose as any,
		silent: args.silent as any,
		'debug-cli': args['debug-cli'] as any,
		'show-config': args['show-config'] as any,
		format,
		errors: errors.filter((e) => 'key' in e && isDeclared(baseCommand, e.key))
	}
}

/**
 * The usage errors to report for the matched command, each with its `code`.
 *
 * Base errors win for global keys: an error the matched command reports on a key that only
 * the base command declares is replaced by the base lookup's errors for that key.
 * A well-formed global flag has none, so it is not reported as unknown under a sub-command,
 * and a malformed one is reported as the invalid value it is, as on the root (#614).
 * A key the matched command declares itself is its own option, not the global one.
 * The order of the matched command's errors is kept.
 */
export function resolveUsageErrors(
	errors: lookupCommand.Error[],
	command: cli.Command,
	baseCommand: cli.Command,
	globals: Pick<GlobalOptions, 'errors'>
): cli.UsageError[] {
	return errors
		.flatMap((e) => {
			if (!('key' in e) || !isDeclared(baseCommand, e.key) || isDeclared(command, e.key)) return [e]
			return globals.errors.filter((g) => 'key' in g && g.key === e.key)
		})
		.map(withCode)
}

const codes = {
	'invalid-key': 'unknown-option',
	'conflicting-options': 'conflicting-options',
	'invalid-value': 'invalid-value',
	'expect-single': 'expect-single',
	'missing-argument': 'missing-argument',
	'extra-arguments': 'extra-arguments'
} as const satisfies Record<lookupCommand.Error['type'], string>

/**
 * The stable kebab-case code of a usage error.
 */
export function usageErrorCode<E extends lookupCommand.Error>(error: E): NonNullable<E['code']> {
	return codes[error.type] as any
}

/**
 * Sets `code` on the error, not enumerable, so equality checks and
 * `JSON.stringify` of an error see the same object as before `code` was added.
 * It becomes a plain property in v12.
 */
function withCode(error: lookupCommand.Error): cli.UsageError {
	return Object.defineProperty(error, 'code', { value: usageErrorCode(error), enumerable: false, configurable: true })
}

function isDeclared(command: cli.Command, key: string) {
	return lookupOptions(command, key).length > 0
}
