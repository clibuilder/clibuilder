/**
 * Interfaces the framework declares and its outer layers implement.
 *
 * They live here, apart from `../cli.ts`, so a module that only needs to *say
 * something* does not depend on the entry point that builds an application.
 * Nothing in this file imports anything — that is the property that makes it
 * safe for any layer to depend on.
 */

export type DisplayLevel = 'none' | 'info' | 'debug' | 'trace'

export type UI = {
	displayLevel: DisplayLevel
	info(...args: any[]): void
	warn(...args: any[]): void
	error(...args: any[]): void
	debug(...args: any[]): void
	/**
	 * Shows the command's help.
	 *
	 * Under `cli({ output: 'axi' })`, called from `run()`, it writes the help on stdout in `this.format`,
	 * as `--help` does: the text help under `text`, the structured help under `toon` and `json`.
	 *
	 * @deprecated the framework owns `--help` and answers it on stdout in `this.format`.
	 * To answer with help from `run()`, return it: `document(text)` writes text verbatim,
	 * and `result(value)` encodes a value in `this.format`. Removed from `ui` in v12 (axi-native RFC section 3.7).
	 */
	showHelp(): void
	/**
	 * Shows the cli version.
	 *
	 * Under `cli({ output: 'axi' })` it writes the version as plain text on stdout, as `--version` does.
	 *
	 * @deprecated the framework owns `--version` and answers it as plain text on stdout.
	 * To answer with the version from `run()`, return it, for example `document(version)`.
	 * Removed from `ui` in v12 (axi-native RFC section 3.7).
	 */
	showVersion(): void
}

/**
 * The two streams a cli writes to.
 * `process.stdout` and `process.stderr` by default.
 */
export type Streams = {
	stdout: NodeJS.WritableStream
	stderr: NodeJS.WritableStream
}

/**
 * Where `ui` messages go: `'axi'` keeps stdout for answers, `'console'` keeps the v11 layout.
 */
export type Output = 'axi' | 'console'
