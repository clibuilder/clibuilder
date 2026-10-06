import { homedir } from 'node:os'

/**
 * Shortens a path under the home directory to `~/...`: the same file for fewer tokens, and no user
 * name in the output.
 */
export function collapseHome(path: string, home: string = homedir()): string {
	const rest = path.slice(home.length)
	if (!home || !path.startsWith(home) || (rest !== '' && rest[0] !== '/' && rest[0] !== '\\')) return path
	return `~${rest}`
}

/**
 * The first lines of a CLI's home view — what it prints when run with no arguments — so an agent
 * knows which tool answered: `bin: ~/.local/bin/my-cli` and `description: ...`.
 *
 * Spread it in front of the live content the home view shows:
 *
 * @example
 * ```ts
 * output.result({ ...homeHeader({ description: 'Manage plugins' }), plugins })
 * ```
 */
export function homeHeader(options: { description: string; bin?: string | undefined; home?: string | undefined }): {
	bin: string
	description: string
} {
	return {
		bin: collapseHome(options.bin ?? process.argv[1] ?? '', options.home ?? homedir()),
		description: options.description
	}
}
