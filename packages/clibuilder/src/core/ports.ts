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
	showHelp(): void
	showVersion(): void
}
