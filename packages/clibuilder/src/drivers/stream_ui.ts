import { inspect, styleText } from 'node:util'
import type { DisplayLevel, Output } from '../core/ports.js'
import { generateHelpMessage } from '../render/help.js'
import type { createUI } from './logger.js'
import type { Sinks } from './streams.js'

type Method = 'debug' | 'info' | 'warn' | 'error' | 'answer'

/**
 * Which stream each `ui` method writes to, per output mode.
 *
 * Internal: a cli picks a preset with `cli({ output })`, never a table (axi-native RFC section 3.10).
 * `console` follows standard-log's console reporter: `info` and `debug` on stdout
 * (`console.debug` is `console.log` in Node), `warn` and `error` on stderr.
 * `axi` treats every `ui` call as a diagnostic, so all of them go to stderr.
 * `answer` is `showHelp` and `showVersion`: `--help` and `--version` are answers, on stdout in both.
 */
export const routing: Record<Output, Record<Method, keyof Sinks>> = {
	console: { debug: 'stdout', info: 'stdout', warn: 'stderr', error: 'stderr', answer: 'stdout' },
	axi: { debug: 'stderr', info: 'stderr', warn: 'stderr', error: 'stderr', answer: 'stdout' }
}

const thresholds: Record<DisplayLevel, number> = { none: 0, info: 1, debug: 2, trace: 3 }
const levels: Record<Method, number> = { error: 1, warn: 1, info: 1, answer: 1, debug: 2 }
const styles: Partial<Record<Method, 'red' | 'yellow'>> = { error: 'red', warn: 'yellow' }

/**
 * The built-in ui: writes each message as one line to the stream its method routes to.
 *
 * A line is the arguments joined by spaces, objects through `util.inspect`,
 * with no printf-style placeholders. This is the line `testCommand`'s `messages` has always held.
 * `error` is red and `warn` is yellow when the stream allows colour (see `shouldColour`).
 */
export function createStreamUI(sinks: Sinks, output: Output): createUI.UI {
	let displayLevel: DisplayLevel = 'info'
	const route = routing[output]

	function write(method: Method, args: any[]) {
		if (levels[method] > thresholds[displayLevel]) return
		const sink = sinks[route[method]]
		const line = formatLine(args, sink.colour)
		const style = styles[method]
		sink.write(`${style && sink.colour ? styleText(style, line, { validateStream: false }) : line}\n`)
	}

	return {
		get displayLevel() {
			return displayLevel
		},
		set displayLevel(level) {
			displayLevel = level
		},
		debug: (...args: any[]) => write('debug', args),
		info: (...args: any[]) => write('info', args),
		warn: (...args: any[]) => write('warn', args),
		error: (...args: any[]) => write('error', args),
		showHelp(cliName, command) {
			write('answer', [generateHelpMessage(cliName, command)])
		},
		showVersion(version) {
			write('answer', [version || 'not versioned'])
		}
	}
}

function formatLine(args: any[], colors: boolean) {
	return args.map((v) => (typeof v === 'object' && v !== null ? inspect(v, { colors }) : v)).join(' ')
}
