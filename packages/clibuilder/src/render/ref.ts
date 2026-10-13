/**
 * Next-step references: `ref()` names another command, and the runner renders it as a command line.
 * Imports nothing from the framework (axi-native RFC section 4.1; next-step-refs RFC).
 */

// `Symbol.for` keys, so a ref from one copy of clibuilder is read by another in the same process
const refKey: unique symbol = Symbol.for('clibuilder.ref') as any
const placeholderKey: unique symbol = Symbol.for('clibuilder.placeholder') as any

/** A value that is not known yet, rendered unquoted as `<name>`. */
export type Placeholder = { readonly [placeholderKey]: string }

/** A reference to another command, made by {@link ref}. */
export type Ref = {
	readonly [refKey]: true
	/** The command path as a user types it, without the cli name, such as `task get`. */
	readonly path: string
	/** The options to pass, keyed by option name. */
	readonly options: Readonly<Record<string, unknown>>
	/** What running it does, as a verb phrase. */
	readonly why: string | undefined
}

/** One next-step suggestion: a plain string, or a {@link Ref} the runner renders as a command line. */
export type HelpLine = string | Ref

/**
 * Turns a ref into the command line that runs it, or `undefined` when it cannot be run in this channel.
 * `cli()` and `runScript()` each supply one.
 */
export type RefResolver = (ref: Ref) => string | undefined

/**
 * Where next-step references go: `'help'` (default) renders each one as a `help` string,
 * `'next'` moves the ones in an answer to a `next[N]{run,why}` key. Errors always use `help`.
 */
export type RefsMode = 'help' | 'next'

/**
 * A reference to another command, for a `help` list.
 *
 * The runner renders it as a complete command line for the channel it runs in:
 * `<cli name> task get --gid 123` under `cli()`, or the sibling script, `pnpm exec` or pinned `npx` line under `runScript()`.
 *
 * Options render as `--name value` in the order given. `true` renders as `--name`, `false` and `undefined` are left out,
 * an array repeats the flag, and a value is single-quoted when the shell would read it otherwise.
 *
 * @param path the command path as a user types it, without the cli name.
 * @param options the options to pass, keyed by option name. Use {@link placeholder} for a value not known yet.
 * @param why what running it does, as a verb phrase: `Run \`…\` to <why>`.
 *
 * @example
 * ```ts
 * return result(task, { help: ref('task get', { gid: task.parent.gid }, 'show the parent task') })
 * ```
 */
export function ref(path: string, options: Record<string, unknown> = {}, why?: string): Ref {
	const words = path.trim().split(/\s+/).filter(Boolean)
	if (words.length === 0) throw new TypeError('ref() needs a command path, such as "task get"')
	return { [refKey]: true, path: words.join(' '), options: { ...options }, why }
}

/**
 * A value a ref cannot know yet, such as an id the agent picks from a list. Rendered unquoted as `<name>`.
 *
 * @example
 * ```ts
 * ref('task update', { gid: placeholder('gid'), name: placeholder('name') }, 'rename a task')
 * ```
 */
export function placeholder(name: string): Placeholder {
	return { [placeholderKey]: name }
}

export function isRef(value: unknown): value is Ref {
	return typeof value === 'object' && value !== null && (value as any)[refKey] === true
}

/** The words after the command path: each option as `--name value`, shell-quoted. */
export function refArgs(ref: Ref): string[] {
	const args: string[] = []
	for (const [name, value] of Object.entries(ref.options)) {
		for (const v of Array.isArray(value) ? value : [value]) {
			if (v === undefined || v === false) continue
			args.push(`--${name}`)
			if (v !== true) args.push(shellQuote(v))
		}
	}
	return args
}

/** The help line a ref renders as: ``Run `<run>` to <why>``. */
export function refHelp(run: string, why: string | undefined) {
	return why ? `Run \`${run}\` to ${why}` : `Run \`${run}\``
}

/**
 * Splits help lines into the `help` strings and the `next` entries to print.
 * A ref the resolver cannot run is dropped, never printed as a bare path.
 */
export function renderHelp(
	lines: readonly HelpLine[],
	resolve: RefResolver = bareResolver,
	refs: RefsMode = 'help'
): { help: string[]; next: Array<{ run: string; why: string }> } {
	const help: string[] = []
	const next: Array<{ run: string; why: string }> = []
	for (const line of lines) {
		if (!isRef(line)) {
			help.push(line)
			continue
		}
		const run = resolve(line)
		if (run === undefined) continue
		if (refs === 'next') next.push({ run, why: line.why ?? '' })
		else help.push(refHelp(run, line.why))
	}
	return { help, next }
}

/** Renders a ref without a cli name, for a caller outside `cli()` and `runScript()`. */
export function bareResolver(ref: Ref) {
	return [ref.path, ...refArgs(ref)].join(' ')
}

/** A word the shell reads as `value`: single-quoted when it has anything else than `[\w./:@%+=,-]`. A placeholder stays `<name>`. */
export function shellQuote(value: unknown): string {
	if (typeof value === 'object' && value !== null && placeholderKey in value) {
		return `<${(value as Placeholder)[placeholderKey]}>`
	}
	const s = String(value)
	return /^[\w./:@%+=,-]+$/.test(s) ? s : `'${s.replace(/'/g, `'\\''`)}'`
}
