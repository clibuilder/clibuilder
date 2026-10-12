/**
 * The headless runner: runs a command's `{ options, run }` without `cli()`.
 * Imports only `args-minus` and the framework-free output contract (axi-native RFC section 4.1, tier B).
 */

import {
	type AnyDescriptor,
	type DefaultOf,
	type OptionDeclaration,
	type OutputOf,
	ParseArgsError,
	parseArgsAsync,
	t
} from 'args-minus'
import { isCliError, isReportedCliError } from '../app/errors.js'
import { printAnswer } from '../render/answer.js'
import { encode, errorOutput, formats, type Format as OutputFormat } from '../render/encode.js'

export namespace runScript {
	/** The format `--format` and `this.format` take: `toon` (default), `json` or `text`. */
	export type Format = OutputFormat

	/** What a script may write to: the part of a Node.js writable stream the runner uses. */
	export type WritableStream = { write(chunk: string): unknown }

	export type Options = {
		/**
		 * The command line to parse, without the node executable and the script path.
		 * Defaults to `process.argv.slice(2)`.
		 */
		argv?: readonly string[] | undefined
		/** Where output goes. Defaults to `process.stdout` and `process.stderr`. */
		streams?: { stdout: WritableStream; stderr: WritableStream } | undefined
	}

	/** How much `this.ui` shows. */
	export type DisplayLevel = 'none' | 'info' | 'debug' | 'trace'

	/** What a script writes messages through: always stderr, so stdout holds only the answer. */
	export type UI = {
		displayLevel: DisplayLevel
		info(...args: any[]): void
		warn(...args: any[]): void
		error(...args: any[]): void
		debug(...args: any[]): void
	}

	/**
	 * What `this` is in `run()`: the format and the ui, nothing else.
	 * There is no `config`, `cwd`, `registry` or keyword, so a command that reads one does not type check here.
	 */
	export type Context = {
		/** The caller's `--format`, `toon` by default. */
		format: Format
		/** Writes to stderr. */
		ui: UI
	}

	/** An option, as in `cli.Command.Options`. `conflicts` is not supported headless. */
	export type Entry<T extends AnyDescriptor = AnyDescriptor> = {
		description: string
		type?: T
		/** The value used when the option is not passed. It is not converted, but the descriptor's checks run on it. */
		default?: DefaultOf<OutputOf<T>>
		alias?: Array<string | { alias: string; hidden: boolean }>
		conflicts?: never
	}

	export type Entries = Record<string, Entry>

	/** The value `run()` gets for each option: the descriptor's output, `boolean | undefined` for a flag without a type. */
	export type Args<O extends Entries> = {
		[K in keyof O]: O[K]['type'] extends infer T
			? T extends AnyDescriptor
				? 0 extends 1 & OutputOf<T>
					? any
					: O[K] extends { default: unknown } | { type: { isOptional: false } }
						? OutputOf<T>
						: OutputOf<T> | undefined
				: boolean | undefined
			: never
	}

	/**
	 * The command `runScript()` runs: the same `{ options, run }` that `cli().command()` takes.
	 * Positional `arguments`, `config` and an option named `format` are not accepted, on purpose:
	 * the runner stays under the 22 KB bundle cap (`script/bundle_size.spec.ts`), and the lookup that
	 * `cli()` uses for positionals, `conflicts` and ranked usage errors costs about 10 KB more.
	 * `format` is rejected by `cli()` too, which owns `--format`: read `this.format` instead.
	 */
	export type Command<O extends Entries = Entries> = {
		name?: string
		description?: string
		alias?: string[]
		examples?: readonly unknown[]
		options?: O & { format?: never }
		arguments?: undefined
		config?: undefined
		run(this: Context, args: Args<O>): unknown
	}
}

/**
 * Runs `command` as a script: parses `--format` and the command's options from `argv`,
 * calls `run()`, prints what it returns and resolves to the exit code.
 *
 * It is the headless twin of `cli().command(command).parse()`, so a command keeps one definition and two entries.
 * The answer is printed as `output: 'axi'` prints it (see `printAnswer()`), `this.ui` writes to stderr,
 * and `this` has no `config`: a command that reads it is a type error here.
 *
 * - A thrown `CliError` is reported with `errorOutput()` on stdout and resolves to its `exitCode`.
 * - A bad invocation (unknown option, bad value, a positional) is reported the same way with code `usage`, and resolves to 2.
 *   Unlike `cli()`, it reports the error `args-minus` finds first, coded `usage`, without ranking or a `help` list.
 * - Any other error rejects.
 *
 * It does not set `process.exitCode`. Do it from the result: `process.exitCode = await runScript(command)`.
 *
 * @example
 * ```ts
 * import { runScript, result } from 'clibuilder/axi'
 * import { t } from 'clibuilder'
 *
 * process.exitCode = await runScript({
 * 	options: { name: { description: 'Who to greet', type: t.string() } },
 * 	run({ name }) {
 * 		return result({ greeting: `hello ${name}` })
 * 	}
 * })
 * ```
 */
export async function runScript<const O extends runScript.Entries = runScript.Entries>(
	command: runScript.Command<O>,
	{ argv = process.argv.slice(2), streams = process }: runScript.Options = {}
): Promise<number> {
	const { stdout, stderr } = streams
	const ui = createUI(stderr)
	if (command.options && 'format' in command.options) {
		throw new TypeError("a command run by runScript() cannot declare its own 'format' option: read this.format instead")
	}

	const declarations: Record<string, OptionDeclaration> = {
		...Object.fromEntries(Object.entries(command.options ?? {}).map(([name, entry]) => [name, declarationOf(entry)])),
		format: { type: t.enum(formats as [runScript.Format, ...runScript.Format[]]), default: 'toon' }
	}
	let format: runScript.Format = 'toon'
	try {
		const { options } = await parseArgsAsync({
			args: [...argv],
			options: declarations,
			strict: true,
			allowPositionals: false
		})
		const { format: parsed, ...args } = options
		format = parsed as runScript.Format
		const returned = await command.run.call({ format, ui }, args as any)
		const text = printAnswer(returned, format)
		if (text !== undefined) stdout.write(text)
		return 0
	} catch (e) {
		if (e instanceof ParseArgsError) {
			const details = e.option === undefined ? undefined : { option: e.option }
			write(stdout, errorOutput({ message: e.message, code: 'usage', details }), format)
			return 2
		}
		if (!isCliError(e)) throw e
		if (!isReportedCliError(e)) {
			write(stdout, errorOutput({ message: e.message, code: e.code, details: e.details, help: e.help }), format)
			ui.debug(e)
		}
		return e.exitCode
	}
}

function write(stream: runScript.WritableStream, report: Record<string, unknown>, format: runScript.Format) {
	stream.write(`${encode(report, format)}\n`)
}

function declarationOf(entry: runScript.Entry): OptionDeclaration {
	const alias = entry.alias?.map((a) => (typeof a === 'string' ? a : a.alias))
	return {
		type: entry.type ?? 'boolean',
		...(alias ? { alias } : {}),
		...(entry.default === undefined ? {} : { default: entry.default })
	} as OptionDeclaration
}

const thresholds: Record<runScript.DisplayLevel, number> = { none: 0, info: 1, debug: 2, trace: 3 }

function createUI(stderr: runScript.WritableStream): runScript.UI {
	let displayLevel: runScript.DisplayLevel = 'info'
	const write = (level: number, args: any[]) => {
		if (level > thresholds[displayLevel]) return
		stderr.write(`${args.map(stringify).join(' ')}\n`)
	}
	return {
		get displayLevel() {
			return displayLevel
		},
		set displayLevel(level) {
			displayLevel = level
		},
		info: (...args) => write(1, args),
		warn: (...args) => write(1, args),
		error: (...args) => write(1, args),
		debug: (...args) => write(2, args)
	}
}

function stringify(value: unknown) {
	if (value instanceof Error) return value.stack ?? value.message
	if (typeof value === 'object' && value !== null) return JSON.stringify(value)
	return String(value)
}
