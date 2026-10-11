/**
 * Interfaces the framework declares and its outer layers implement.
 *
 * They live here, apart from `../cli.ts`, so a module that only needs to *say
 * something* does not depend on the entry point that builds an application.
 * Nothing in this file imports anything — that is the property that makes it
 * safe for any layer to depend on.
 */

/** How much the cli's `ui` shows; each level includes the ones before it. */
export type DisplayLevel = 'none' | 'info' | 'debug' | 'trace'

/** What a cli and its commands write messages through. */
export type UI = {
	displayLevel: DisplayLevel
	info(...args: any[]): void
	warn(...args: any[]): void
	error(...args: any[]): void
	debug(...args: any[]): void
	/**
	 * Shows the command's help on stdout: in `this.format` from `run()` under the default `axi` output,
	 * as `--help` does, and as text anywhere else.
	 *
	 * @deprecated return the help from `run()`: `document(text)` writes text verbatim, and `result(value)`
	 * encodes a value in `this.format`. Removed in a later major (axi-native RFC section 3.7).
	 */
	showHelp(): void
	/**
	 * Shows the cli version as plain text on stdout, as `--version` writes it.
	 *
	 * @deprecated return the version from `run()`, for example `document(version)`.
	 * Removed in a later major (axi-native RFC section 3.7).
	 */
	showVersion(): void
}

/**
 * The two streams a cli writes to.
 * `process.stdout` and `process.stderr` by default.
 */
export type Streams = {
	stdout: WritableStream
	stderr: WritableStream
}

/**
 * The part of a Node.js writable stream a cli uses.
 * It is declared here so the published types do not need `@types/node`.
 */
export type WritableStream = {
	write(chunk: string): unknown
	/**
	 * Colour is off unless this is `true`.
	 */
	isTTY?: boolean
	hasColors?(env?: Record<string, string | undefined>): boolean
}

/**
 * How a cli writes its output: `'axi'` (default) keeps stdout for answers, `'console'` keeps the clibuilder 11 layout.
 */
export type Output = 'axi' | 'console'
