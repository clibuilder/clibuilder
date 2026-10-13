/**
 * The headless runner: runs a command's `{ arguments, options, run }` without `cli()`.
 * It looks the invocation up and reports usage errors with the code `cli()` uses (`invocation/`, `render/usage_error`),
 * and never reaches `cli()`, the builder or config (axi-native RFC section 4.1, tier B).
 */

import { type AnyDescriptor, type DefaultOf, type OutputOf, t } from 'args-minus'
import { helpLinesOf, isCliError, isReportedCliError } from '../app/errors.js'
import { parseArgv } from '../invocation/argv.js'
import { convertDescriptors } from '../invocation/descriptors.js'
import { lookupCommand, lookupOptions } from '../invocation/lookup.js'
import { printAnswer } from '../render/answer.js'
import { encode, errorOutput, formats, type Format as OutputFormat } from '../render/encode.js'
import { type RefsMode, renderHelp } from '../render/ref.js'
import { describeUsageError, topUsageError } from '../render/usage_error.js'
import { readScriptData, type ScriptData, scriptResolver } from './refs.js'

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
		/**
		 * Where the `ref()` lines in an answer's `help` go: `'help'` (default) or `'next'`, as in `cli({ refs })`.
		 * A `CliError` keeps its refs in `help` either way.
		 */
		refs?: RefsMode | undefined
		/**
		 * The command map refs are rendered from. Defaults to `globalThis.__SKILL_SCRIPT__`,
		 * which `universal-plugin plugin build` writes into each compiled skill script.
		 * Without either, a ref is left out of the output.
		 */
		commands?: ScriptData | undefined
	}

	/** The command map a compiled skill script carries (cyberuni/universal-plugin#177). */
	export type CommandMap = ScriptData

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

	/** A positional argument, as in `cli.Command.Argument`. Without a `type` it is a string. */
	export type Argument<Name extends string = string, T extends AnyDescriptor = AnyDescriptor> = {
		name: Name
		description: string
		type?: T
	}

	/** An option, as in `cli.Command.Options`. */
	export type Entry<T extends AnyDescriptor = AnyDescriptor> = {
		description: string
		type?: T
		/** The value used when the option is not passed. It is not converted, but the descriptor's checks run on it. */
		default?: DefaultOf<OutputOf<T>>
		alias?: Array<string | { alias: string; hidden: boolean }>
		/** Names of the options this one cannot be used with. Passing both is a usage error; a default does not count. */
		conflicts?: readonly string[]
	}

	export type Entries = Record<string, Entry>

	/**
	 * The value `run()` gets for each argument and option: the descriptor's output,
	 * `string` for an argument without a type and `boolean | undefined` for a flag without one.
	 */
	export type Args<O extends Entries, A extends readonly Argument[] = []> = OptionArgs<O> & ArgumentArgs<A>

	/** An argument array whose names are not literal, such as one not declared `as const`, types every name as `any`. */
	export type ArgumentArgs<A extends readonly Argument[]> = string extends A[number]['name']
		? Record<string, any>
		: {
				[E in A[number] as E['name']]: E['type'] extends infer T
					? T extends AnyDescriptor
						? 0 extends 1 & OutputOf<T>
							? any
							: T extends { isOptional: false }
								? OutputOf<T>
								: OutputOf<T> | undefined
						: string
					: never
			}

	export type OptionArgs<O extends Entries> = {
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
	 * The command `runScript()` runs: the same `{ arguments, options, run }` that `cli().command()` takes.
	 * `config` and sub-commands are not accepted, and neither is an option named `format`:
	 * `cli()` rejects that too, as it owns `--format`. Read `this.format` instead.
	 */
	export type Command<O extends Entries = Entries, A extends readonly Argument[] = []> = {
		name?: string
		description?: string
		alias?: string[]
		examples?: readonly unknown[]
		arguments?: A
		options?: O & { format?: never }
		config?: undefined
		run(this: Context, args: Args<O, A>): unknown
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
 * - A bad invocation is reported as `cli({ output: 'axi' })` reports it: the top-ranked usage error alone, with its `code`
 *   (`unknown-option`, `conflicting-options`, `invalid-value`, `expect-single`, `missing-argument` or `extra-arguments`),
 *   `details` and `help`, and resolves to 2. The usage line names the command, as there is no cli name.
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
export async function runScript<
	const O extends runScript.Entries = runScript.Entries,
	const A extends readonly runScript.Argument[] = []
>(
	command: runScript.Command<O, A>,
	{ argv = process.argv.slice(2), streams = process, refs = 'help', commands }: runScript.Options = {}
): Promise<number> {
	const { stdout, stderr } = streams
	const ui = createUI(stderr)
	const resolve = scriptResolver(commands ?? readScriptData())
	if (command.options && 'format' in command.options) {
		throw new TypeError("a command run by runScript() cannot declare its own 'format' option: read this.format instead")
	}

	// the command as `cli()` would look it up, named by itself as there is no cli name, with `--format` as its own option
	const target = { ...command, name: undefined } as any
	const declared = { ...target, options: { ...command.options, format: formatEntry } }
	const r = lookupCommand(declared, parseArgv(['', '', ...argv]))
	await convertDescriptors(r)
	const { _, format: parsed, ...args } = r.args as Record<string, any>
	const formatInvalid = r.errors.some((e) => 'key' in e && lookupOptions(declared, e.key)[0] === 'format')
	const format: runScript.Format = formatInvalid ? 'toon' : parsed
	try {
		const error = topUsageError(r.errors)
		if (error) {
			write(stdout, errorOutput(describeUsageError(error, target, command.name ?? 'script', false)), format)
			return 2
		}
		const returned = await command.run.call({ format, ui }, args as any)
		const text = printAnswer(returned, format, { resolve, refs })
		if (text !== undefined) stdout.write(text)
		return 0
	} catch (e) {
		if (!isCliError(e)) throw e
		if (!isReportedCliError(e)) {
			const { help } = renderHelp(helpLinesOf(e), resolve)
			write(stdout, errorOutput({ message: e.message, code: e.code, details: e.details, help }), format)
			ui.debug(e)
		}
		return e.exitCode
	}
}

const formatEntry = {
	description: 'Output format',
	type: t.enum(formats as [runScript.Format, ...runScript.Format[]]),
	default: 'toon'
}

function write(stream: runScript.WritableStream, report: Record<string, unknown>, format: runScript.Format) {
	stream.write(`${encode(report, format)}\n`)
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
