import { isGlobalFormatEntry } from '../builtin/base_command.js'
import type { cli } from '../cli.js'
import type { parseArgv } from '../invocation/argv.js'
import { convertDescriptorsSync } from '../invocation/descriptors.js'
import { lookupCommand, lookupOptions } from '../invocation/lookup.js'
import { formats } from '../render/encode.js'
import { usageErrorCode } from '../render/usage_error.js'

/** The global options, resolved from the base command's lookup alone, before the matched command's usage errors are looked at. */
export type GlobalOptions = {
	help?: boolean | undefined
	version?: boolean | undefined
	verbose?: boolean | undefined
	silent?: boolean | undefined
	'debug-cli'?: boolean | undefined
	/** Every value the base lookup read, extensions' global options included. */
	values: Record<string, unknown>
	/** The valid `--format` value, else the cli's default format. */
	format: cli.Format
	/** The base lookup's errors on its own options. They are the only errors reported for a global key. */
	errors: lookupCommand.Error[]
}

/**
 * Looks the invocation up on the base command, the single source of truth for the global options.
 * A bad `--format` value falls back to `format`, so its usage error is reported in a valid format and cannot loop.
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
		values: args,
		format: (formatValid && (args.format as any as cli.Format | undefined)) || format,
		errors: globalErrors
	}
}

/**
 * The usage errors to report for the matched command, each with its `code`.
 *
 * Base errors win for a key only the base command declares (#614): a well-formed global flag
 * is not unknown under a sub-command, and a malformed one is reported as on the root.
 * A key the matched command declares itself is its own option, except the root's global `--format`.
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

// not enumerable, so equality checks and `JSON.stringify` see the same object as before `code` existed
function withCode(error: lookupCommand.Error): cli.UsageError {
	return Object.defineProperty(error, 'code', { value: usageErrorCode(error), enumerable: false, configurable: true })
}

function isDeclared(command: cli.Command, key: string) {
	return lookupOptions(command, key).length > 0
}

function isOwn(command: cli.Command, key: string) {
	const [name, entry] = lookupOptions(command, key)
	return !!name && !isGlobalFormatEntry(entry)
}

function isGlobalFormatKey(baseCommand: cli.Command, key: string) {
	return isGlobalFormatEntry(lookupOptions(baseCommand, key)[1])
}

// lets a handler list the allowed formats (axi-native RFC section 3.2)
function withAllowedFormats(baseCommand: cli.Command) {
	return (e: lookupCommand.Error): lookupCommand.Error =>
		e.type === 'invalid-value' && isGlobalFormatKey(baseCommand, e.key) ? { ...e, allowed: formats } : e
}
