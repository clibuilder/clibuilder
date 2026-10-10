import type { cli } from '../cli.js'
import type { lookupCommand } from '../invocation/lookup.js'

/**
 * Describes one `lookupCommand` error in the terms the caller used:
 * which option or argument was wrong, and what was expected.
 *
 * @param command the command the error was found on, used to tell an
 * argument name apart from an option name.
 */
export function formatLookupError(error: lookupCommand.Error, command: cli.Command): string {
	switch (error.type) {
		case 'invalid-key':
			return `unknown option ${formatOption(error.key)}`
		case 'missing-argument':
			return `missing required argument <${error.name}>`
		case 'extra-arguments':
			return `unexpected argument${error.values.length > 1 ? 's' : ''}: ${error.values.join(', ')}`
		case 'invalid-value':
			return `invalid value for ${formatKey(error.key, command)}: ${error.message}, received "${error.value}"`
		case 'conflicting-options':
			return `option ${formatOption(error.key)} cannot be used with option ${formatOption(error.conflictsWith)}`
		case 'expect-single':
			return `${formatKey(error.key, command)} expects a single value, received: ${toArray(error.value).join(', ')}`
	}
}

function formatKey(key: string, command: cli.Command) {
	return command.arguments?.some((a) => a.name === key) ? `argument <${key}>` : `option ${formatOption(key)}`
}

function formatOption(key: string) {
	return key.length === 1 ? `-${key}` : `--${key}`
}

function toArray(value: any) {
	return Array.isArray(value) ? value : [value]
}
