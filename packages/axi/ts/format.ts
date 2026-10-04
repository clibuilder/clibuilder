import { z } from 'clibuilder'

/**
 * How a command renders its result.
 *
 * `toon` is the default because an agent-facing command is read by an agent far more often
 * than by a person, and TOON is the cheaper read for one. `json` is what survives a pipe into
 * `jq`, and `text` is the report a person wants.
 */
export type OutputFormat = 'toon' | 'json' | 'text'

/** Every supported format, the default first. */
export const formats = ['toon', 'json', 'text'] as const satisfies readonly OutputFormat[]

/**
 * Rejects anything but the supported formats, so an unknown value never falls back silently.
 *
 * A command that declares {@link formatOption} does not need it: clibuilder already rejects an
 * unknown value as a usage error. It is for a format read from somewhere else, such as an
 * environment variable or a config file.
 */
export function parseFormat(value: string | undefined): OutputFormat {
	if (!formats.includes(value as OutputFormat)) throw new Error('--format must be toon, json, or text.')
	return value as OutputFormat
}

/**
 * Declares a `--format` option for a command whose default or wording differs from
 * {@link formatOption} — for example one whose `text` output is a document a person reads.
 *
 * @example
 * ```ts
 * options: { format: defineFormatOption({ default: 'text' }) }
 * ```
 */
export function defineFormatOption<D extends OutputFormat = 'toon'>(
	options: { default?: D; description?: string } = {}
) {
	const defaultFormat = (options.default ?? 'toon') as D
	return {
		type: z.optional(z.enum(formats)),
		description:
			options.description ??
			`Output format: ${formats.map((f) => (f === defaultFormat ? `${f} (default)` : f)).join(', ')} — toon for agents, json to pipe, text for humans`,
		default: defaultFormat
	}
}

/**
 * The `--format` option, declared once so every agent-facing command offers the same three
 * values, the same wording, and the same default. Spread it into a command's `options`:
 *
 * @example
 * ```ts
 * options: { format: formatOption }
 * ```
 *
 * An unknown value is a usage error (exit code 2), reported by clibuilder before `run` is called.
 */
export const formatOption = defineFormatOption()
