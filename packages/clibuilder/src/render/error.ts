import type { cli } from '../cli.js'
import type { lookupCommand } from '../invocation/lookup.js'

/** Describes one `lookupCommand` error in the terms the caller used. `command` tells an argument name from an option name. */
export function formatLookupError(error: lookupCommand.Error, command: cli.Command): string {
	switch (error.type) {
		case 'invalid-key':
			return `unknown option ${formatOption(error.key)}`
		case 'missing-argument':
			// an option declared with `t` that is neither optional nor defaulted must be passed
			return `missing required ${formatKey(error.name, command, 'argument')}`
		case 'extra-arguments':
			return `unexpected argument${error.values.length > 1 ? 's' : ''}: ${error.values.join(', ')}`
		case 'invalid-value': {
			const at = error.index === undefined ? '' : `[${error.index}]`
			// an option declared with `t` can be given no value at all
			const received = error.value === undefined ? '' : `, received "${error.value}"`
			return `invalid value for ${formatKey(error.key, command)}${at}: ${error.message}${received}`
		}
		case 'conflicting-options':
			return `option ${formatOption(error.key)} cannot be used with option ${formatOption(error.conflictsWith)}`
		case 'expect-single':
			return `${formatKey(error.key, command)} expects a single value, received: ${toArray(error.value).join(', ')}`
	}
}

function formatKey(key: string, command: cli.Command, fallback: 'argument' | 'option' = 'option') {
	if (command.arguments?.some((a) => a.name === key)) return `argument <${key}>`
	if (fallback === 'argument' && !command.options?.[key]) return `argument <${key}>`
	return `option ${formatOption(key)}`
}

function formatOption(key: string) {
	return key.length === 1 ? `-${key}` : `--${key}`
}

function toArray(value: any) {
	return Array.isArray(value) ? value : [value]
}
