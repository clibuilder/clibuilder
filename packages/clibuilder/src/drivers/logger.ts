import { type Logger, logLevels } from 'standard-log'
import type { Command } from '../command/internal.js'
import type { DisplayLevel } from '../core/ports.js'
import { generateHelpMessage } from '../render/help.js'

/**
 * The framework-facing ui: everything `createUI` offers, plus the `dump` that
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
			entries.forEach(([m, args]) => {
				ui[m](...args)
			})
		}
	}
}

/**
 * The standard-log engine behind the default `cli()` in v11.
 *
 * Removed in v12 with standard-log (slim-dependencies RFC section 4),
 * when `createStreamUI` becomes the only engine.
 */
export function createUI(log: Logger): createUI.UI {
	log.level = logLevels.info
	return {
		get displayLevel() {
			if (log.level! <= logLevels.none) return 'none'

			if (log.level! <= logLevels.info) return 'info'

			if (log.level! <= logLevels.debug) return 'debug'
			return 'trace'
		},
		set displayLevel(level) {
			switch (level) {
				case 'none':
					log.level = logLevels.none
					break
				case 'debug':
					log.level = logLevels.debug
					break
				case 'trace':
					log.level = logLevels.trace
					break
			}
		},
		debug: (...args: any[]) => log.debug(...args),
		info: (...args: any[]) => log.info(...args),
		warn: (...args: any[]) => log.warn(...args),
		error: (...args: any[]) => log.error(...args),
		showHelp: (cliName: string, command: Command) => {
			const msg = generateHelpMessage(cliName, command)
			log.info(msg)
		},
		showVersion(version?: string) {
			log.info(version || 'not versioned')
		}
	}
}

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
