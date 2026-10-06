/**
 * Next-step suggestions, written under the `help` key after the result: `help[1]: Run ...` in
 * TOON. One string or several; an empty list is the same as none, and the key is left out.
 */
export type Help = string | readonly string[]

/** Normalizes {@link Help} to a list, empty when there is nothing to suggest. */
export function helpLines(help: Help | undefined): string[] {
	if (help === undefined) return []
	return typeof help === 'string' ? [help] : [...help]
}

/**
 * Appends the next-step suggestions to a result under `help`, last so they read after the answer.
 * Returns the value unchanged when there is nothing to suggest — a self-contained answer carries no
 * hint.
 */
export function withHelp<T extends object>(
	value: T,
	help: Help | undefined
): T | (Omit<T, 'help'> & { help: string[] }) {
	const lines = helpLines(help)
	if (lines.length === 0) return value
	const { help: _, ...rest } = value as T & { help?: unknown }
	return { ...rest, help: lines } as Omit<T, 'help'> & { help: string[] }
}
