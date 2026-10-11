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
	 * Called from `run()` in the default `axi` output, it writes the help on stdout in `this.format`,
	 * as `--help` does: the text help under `text`, the structured help under `toon` and `json`.
	 * Anywhere else, and in `console` output, it writes the text help on stdout.
	 *
	 * @deprecated the framework owns `--help` and answers it on stdout in `this.format`.
	 * To answer with help from `run()`, return it: `document(text)` writes text verbatim,
	 * and `result(value)` encodes a value in `this.format`.
	 * It stays on `ui` in clibuilder 12 so a command that shows its own help keeps working,
	 * and is removed in a later major (axi-native RFC section 3.7).
	 */
	showHelp(): void
	/**
	 * Shows the cli version: plain text on stdout, as `--version` writes it.
	 *
	 * @deprecated the framework owns `--version` and answers it as plain text on stdout.
	 * To answer with the version from `run()`, return it, for example `document(version)`.
	 * It stays on `ui` in clibuilder 12 so existing commands keep working,
	 * and is removed in a later major (axi-native RFC section 3.7).
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
 * How a cli writes its output: `'axi'` (default) keeps stdout for answers, `'console'` keeps the clibuilder 11 layout.
 */
export type Output = 'axi' | 'console'
