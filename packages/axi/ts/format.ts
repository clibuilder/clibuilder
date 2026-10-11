import { t } from 'clibuilder'

/**
 * How a command renders its result.
 *
 * @deprecated use `cli.Format` from `clibuilder`. @clibuilder/axi is no longer developed.
 */
export type OutputFormat = 'toon' | 'json' | 'text'

/**
 * Every supported format, the default first.
 *
 * @deprecated clibuilder 12 has a global `--format` option; read the resolved value from `this.format`. @clibuilder/axi is no longer developed.
 */
export const formats = ['toon', 'json', 'text'] as const satisfies readonly OutputFormat[]

/**
 * Rejects anything but the supported formats, so an unknown value never falls back silently.
 *
 * @deprecated clibuilder 12 has a global `--format` option and rejects a bad value as a usage error; read the resolved value from `this.format`. @clibuilder/axi is no longer developed.
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
 *
 * @deprecated clibuilder 12 has a global `--format` option; set the default with `cli({ format })` and read the resolved value from `this.format`. A command that declares its own `format` option fails at startup. @clibuilder/axi is no longer developed.
 */
export function defineFormatOption<D extends OutputFormat = 'toon'>(
	options: { default?: D; description?: string } = {}
) {
	const defaultFormat = (options.default ?? 'toon') as D
	return {
		type: t.enum(formats).optional(),
		description:
			options.description ??
			`Output format: ${formats.map((f) => (f === defaultFormat ? `${f} (default)` : f)).join(', ')} — toon for agents, json to pipe, text for humans`,
		default: defaultFormat
	}
}

/**
 * The `--format` option, declared once so every command offers the same values and default.
 *
 * @deprecated clibuilder 12 has a global `--format` option; delete the local declaration and read `this.format`. A command that declares its own `format` option fails at startup. @clibuilder/axi is no longer developed.
 */
export const formatOption = defineFormatOption()
