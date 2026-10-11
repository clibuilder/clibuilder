import { ArrayPush, ArraySlice, StringSlice } from './_primordials.js'

export interface OptionToken {
	kind: 'option'
	index: number
	name: string
	/**
	 * The number of leading modifier characters (dashes by default).
	 */
	dashes: number
	raw: string
	value?: string | undefined
}

export interface OptionTerminatorToken {
	kind: 'option-terminator'
	index: number
}

export interface PositionalToken {
	kind: 'positional'
	index: number
	value: string
}

export type Token = OptionToken | OptionTerminatorToken | PositionalToken

/**
 * The syntax the tokenizer recognizes.
 * Both fields are optional; the defaults are the conventional CLI grammar.
 */
export interface Grammar {
	/**
	 * The characters that mark an option, e.g. `'-'` or `['-', '/']`.
	 * Each must be a single character other than `=`.
	 * Their number at the start of an argument is reported as `dashes`.
	 * **Default: `'-'`.**
	 */
	modifiers?: string | readonly string[]
	/**
	 * The argument that ends option parsing; everything after it is positional.
	 * It is matched exactly, before modifiers are considered, so it is
	 * recognized even if it starts with a modifier.
	 * **Default: `'--'`.**
	 */
	terminator?: string
}

const DEFAULT_GRAMMAR = { modifiers: '-', terminator: '--' } as const

function resolveGrammar(grammar: Grammar | undefined) {
	const modifiers = new Set<string>()
	const list = grammar?.modifiers ?? DEFAULT_GRAMMAR.modifiers
	for (const m of typeof list === 'string' ? Array.from(list) : list) {
		if (m.length !== 1 || m === '=') {
			throw new Error(`Invalid modifier '${m}': a modifier must be a single character other than '='`)
		}
		modifiers.add(m)
	}
	if (modifiers.size === 0) throw new Error('At least one modifier is required')
	const terminator = grammar?.terminator ?? DEFAULT_GRAMMAR.terminator
	if (terminator === '') throw new Error('The terminator must not be empty')
	return { modifiers, terminator }
}

function trimModifiers(arg: string, modifiers: ReadonlySet<string>) {
	let i = 0
	while (i < arg.length && modifiers.has(arg[i]!)) i++
	return [StringSlice.call(arg, i), i] as const
}

/**
 * Split argv into tokens, in source order, without interpreting them.
 * `grammar` customizes the option modifiers and the terminator.
 */
export function tokenizeArgs(args: string[], grammar?: Grammar): Token[] {
	const { modifiers, terminator } = resolveGrammar(grammar)
	const tokens: Token[] = []
	let index = 0

	const remainingArgs: string[] = ArraySlice.call(args)
	while (remainingArgs.length > 0) {
		const raw = remainingArgs.shift()!
		if (raw === terminator) {
			ArrayPush.call(tokens, {
				kind: 'option-terminator',
				index
			})
			index++
			ArrayPush.apply(
				tokens,
				remainingArgs.map((value, i) => ({
					kind: 'positional',
					index: index + i,
					value
				}))
			)
			break
		}

		const [name, dashes] = trimModifiers(raw, modifiers)
		if (dashes === 0 || !name)
			ArrayPush.call(tokens, {
				kind: 'positional',
				index,
				value: name || raw
			})
		else {
			const eq = name.indexOf('=')
			const [n, value] = eq === -1 ? [name, undefined] : [StringSlice.call(name, 0, eq), StringSlice.call(name, eq + 1)]
			ArrayPush.call(tokens, {
				kind: 'option',
				index,
				name: n,
				dashes,
				raw,
				value
			})
		}

		index++
	}
	return tokens
}
