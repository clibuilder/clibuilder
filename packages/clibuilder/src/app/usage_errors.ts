import { isGlobalFormatEntry } from '../builtin/base_command.js'
import type { cli } from '../cli.js'
import type { parseArgv } from '../invocation/argv.js'
import { convertDescriptorsSync } from '../invocation/descriptors.js'
import { lookupCommand, lookupOptions } from '../invocation/lookup.js'
import { formats } from '../render/encode.js'
import { usageErrorCode } from '../render/usage_error.js'

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
	/**
	 * The `--format` value, when the global `--format` is active and the value is valid,
	 * else the cli's default format.
	 */
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
 * @param format the cli's resolved default format: the `cli({ format })` value, `toon` by default.
 * A bad `--format` value falls back to it, so the usage error for it is reported in a valid format and cannot loop.
 */
export function resolveGlobalOptions(
	baseCommand: cli.Command,
	rawArgs: parseArgv.Result,
	format: cli.Format
): GlobalOptions {
	const r = lookupCommand(baseCommand, rawArgs)
	// the global options are flags and an enum, which take no async converter or check
	convertDescriptorsSync(r)
	const { args, errors } = r
	const globalErrors = errors
		.filter((e) => 'key' in e && isDeclared(baseCommand, e.key))
		.map(withAllowedFormats(baseCommand))
	const formatValid = !globalErrors.some((e) => 'key' in e && isGlobalFormatKey(baseCommand, e.key))
	return {
		help: args.help as any,
		version: args.version as any,
		verbose: args.verbose as any,
		silent: args.silent as any,
		'debug-cli': args['debug-cli'] as any,
		'show-config': args['show-config'] as any,
		format: (formatValid && (args.format as any as cli.Format | undefined)) || format,
		errors: globalErrors
	}
}

/**
 * The usage errors to report for the matched command, each with its `code`.
 *
 * Base errors win for global keys: an error the matched command reports on a key that only
 * the base command declares is replaced by the base lookup's errors for that key.
 * A well-formed global flag has none, so it is not reported as unknown under a sub-command,
 * and a malformed one is reported as the invalid value it is, as on the root (#614).
 * A key the matched command declares itself is its own option, not the global one,
 * except the global `--format` entry the root command carries.
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
			if (!('key' in e) || !isDeclared(baseCommand, e.key) || isOwn(command, e.key)) return [e]
			return globals.errors.filter((g) => 'key' in g && g.key === e.key)
		})
		.map(withCode)
}

export { usageErrorCode }

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

/**
 * Whether `command` declares `key` as its own option, not as the global `--format` the root command carries.
 */
function isOwn(command: cli.Command, key: string) {
	const [name, entry] = lookupOptions(command, key)
	return !!name && !isGlobalFormatEntry(entry)
}

function isGlobalFormatKey(baseCommand: cli.Command, key: string) {
	return isGlobalFormatEntry(lookupOptions(baseCommand, key)[1])
}

/**
 * Adds the allowed formats to an invalid `--format` value, so a handler can list them (axi-native RFC section 3.2).
 */
function withAllowedFormats(baseCommand: cli.Command) {
	return (e: lookupCommand.Error): lookupCommand.Error =>
		e.type === 'invalid-value' && isGlobalFormatKey(baseCommand, e.key) ? { ...e, allowed: formats } : e
}
