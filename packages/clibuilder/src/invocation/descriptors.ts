import { type OptionDeclaration, ParseArgsError, parseArgsAsync } from 'args-minus'
import type { cli } from '../cli.js'
import { describeConstraint } from '../descriptor.js'
import type { AnyDescriptor } from '../t.js'
import type { lookupCommand } from './lookup.js'

/**
 * One occurrence of an option declared with `t`: the key as typed and its argv tokens,
 * e.g. `['--port', '80']`, `['--port=80']` or `['-vp', '80']`.
 */
export type DescriptorOccurrence = { key: string; tokens: string[] }

/**
 * A declaration with `t` of the matched command, with its raw input.
 */
export type DescriptorInput =
	| {
			type: 'option'
			name: string
			entry: cli.Command.Options.Entry<AnyDescriptor>
			occurrences: DescriptorOccurrence[]
	  }
	| { type: 'argument'; name: string; descriptor: AnyDescriptor; values: string[] }

// the declaration handed to `args-minus` for each option entry, kept so the checks of a default run once
const declarations = new WeakMap<object, OptionDeclaration>()

/**
 * Converts and checks every declaration with `t` of the matched command through `args-minus`,
 * filling `result.args` and adding a usage error to `result.errors` for each declaration that fails.
 *
 * An option is parsed by `parseArgsAsync` from its own argv tokens, so `args-minus` tokenizes it and
 * decides its value, its default, whether it is required, and its checks.
 * An argument has no option token, so each of its values is given to `parseArgsAsync` inline.
 * Declarations run one at a time, in order, because a converter or check may be async.
 *
 * A converter that throws anything but a plain `Error`, a check that throws,
 * and a `default` that fails its checks are not usage errors: they reject.
 */
export async function convertDescriptors(result: lookupCommand.Result) {
	for (const input of result.descriptors) {
		const [args, declaration] =
			input.type === 'option'
				? [input.occurrences.flatMap((o) => o.tokens), declarationOf(input.entry)]
				: [input.values.map((v) => `--${input.name}=${v}`), { type: input.descriptor }]
		try {
			const { options } = await parseArgsAsync({ args, options: { [input.name]: declaration } })
			if (options[input.name] !== undefined) result.args[input.name] = options[input.name] as any
		} catch (e) {
			if (!(e instanceof ParseArgsError)) throw e
			result.errors.push(toUsageError(e, input))
		}
	}
}

function declarationOf(entry: cli.Command.Options.Entry<AnyDescriptor>): OptionDeclaration {
	let declaration = declarations.get(entry)
	if (!declaration) {
		const alias = entry.alias?.map((a) => (typeof a === 'string' ? a : a.alias))
		declaration = {
			type: entry.type!,
			...(alias ? { alias } : {}),
			...(entry.default === undefined ? {} : { default: entry.default })
		}
		declarations.set(entry, declaration)
	}
	return declaration
}

function toUsageError(e: ParseArgsError, input: DescriptorInput): lookupCommand.Error {
	if (e.kind === 'missing-option') return { type: 'missing-argument', name: input.name }
	const descriptor = input.type === 'option' ? input.entry.type! : input.descriptor
	const element = descriptor.kind === 'array' ? descriptor.element : descriptor
	return {
		type: 'invalid-value',
		key: keyOf(e, input),
		message: e.detail,
		// a check on a whole array has no single value: report every value given
		value: e.value ?? (e.kind === 'invalid-value' ? rawValues(input) : undefined),
		keyKind: descriptor.kind,
		constraint: describeConstraint(element),
		...(element.kind === 'enum' ? { allowed: element.values } : {}),
		...(e.index === undefined ? {} : { index: e.index })
	}
}

/**
 * The option key as the caller typed it (an alias, say), for the occurrence that failed.
 */
function keyOf(e: ParseArgsError, input: DescriptorInput) {
	if (input.type === 'argument') return input.name
	const o = input.occurrences
	return (e.index === undefined ? o[o.length - 1] : o[e.index])?.key ?? input.name
}

function rawValues(input: DescriptorInput) {
	if (input.type === 'argument') return input.values
	return input.occurrences.map((o) => o.tokens.join(' '))
}
