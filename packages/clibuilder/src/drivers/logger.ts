import type { Command } from '../command/internal.js'
import type { DisplayLevel } from '../core/ports.js'

/**
 * The framework-facing ui: everything `createUI.UI` offers, plus the `dump` that
 * releases the messages buffered before the display level was known.
 */
export type BuilderUI = createUI.UI & { dump(): void }

export function createBuilderUI(ui: createUI.UI): BuilderUI {
	let pending = true
	const entries: Array<['debug' | 'info' | 'warn' | 'error', any[]]> = []
	// istanbul ignore next
	return {
		...ui,
		get displayLevel() {
			return ui.displayLevel
		},
		set displayLevel(level) {
			ui.displayLevel = level
		},
		debug: (...args: any[]) => (pending ? entries.push(['debug', args]) : ui.debug(...args)),
		info: (...args: any[]) => (pending ? entries.push(['info', args]) : ui.info(...args)),
		warn: (...args: any[]) => (pending ? entries.push(['warn', args]) : ui.warn(...args)),
		error: (...args: any[]) => (pending ? entries.push(['error', args]) : ui.error(...args)),
		dump: () => {
			pending = false
			// released once: a later `parse()` dumps again, and must not repeat them
			for (const [m, args] of entries.splice(0)) ui[m](...args)
		}
	}
}

/**
 * The ui the framework hands out, which `createStreamUI` implements.
 *
 * The namespace is what is left of v11's standard-log `createUI`,
 * kept so the type keeps its name where it is used.
 */
export namespace createUI {
	/**
	 * The ui the framework hands out, told what to render:
	 * `showHelp` and `showVersion` take what the command-facing `UI` port fills in.
	 */
	export type UI = {
		displayLevel: DisplayLevel
		debug(...args: any[]): void
		info(...args: any[]): void
		warn(...args: any[]): void
		error(...args: any[]): void
		showHelp(cliName: string, command: Command): void
		showVersion(version?: string): void
	}
}
