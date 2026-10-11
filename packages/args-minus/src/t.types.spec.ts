import type { StandardSchemaV1 as PublishedStandardSchemaV1 } from '@standard-schema/spec'
import { z } from 'zod'
import { type Descriptor, parseArgs, parseArgsAsync, type StandardSchemaV1, t } from './index.js'

// These assertions are checked by `tsc` (the build), not at runtime.
// Each deliberately wrong expectation sits under `@ts-expect-error`: an unused directive is itself an error.
type Equal<A, B> = (<X>() => X extends A ? 1 : 2) extends <X>() => X extends B ? 1 : 2 ? true : false
function assert<_ extends true>() {}

const Port: StandardSchemaV1<number, number & { __port: true }> = {
	'~standard': { version: 1, vendor: 'test', validate: (value) => ({ value: value as number & { __port: true } }) }
}

// The declared options, without the index signature for undeclared ones.
type Known<T> = { [K in keyof T as string extends K ? never : K]: T[K] }

it('infers every builder exactly through parseArgs', () => {
	const r = parseArgs({
		args: ['--name=a', '--size=1px', '--ratio=0', '--on', '--mode=fast', '--three=3', '--level=info'],
		options: {
			name: { type: t.string() },
			size: { type: t.string<`${number}px`>({ pattern: /^\d+px$/ }) },
			ratio: { type: t.number({ min: 0, max: 1 }) },
			lines: { type: t.int({ min: 1 }).optional() },
			verbose: { type: t.boolean().optional() },
			on: { type: t.literal(true) },
			mode: { type: t.literal('fast') },
			three: { type: t.literal(3) },
			level: { type: t.enum(['debug', 'info', 'warn']) },
			modes: { type: t.array(t.enum(['a', 'b'])), default: [] },
			ports: { type: t.array(t.int({ min: 1, max: 65535 })).optional() },
			when: { type: t.custom((raw) => new Date(raw)).optional() },
			later: { type: t.custom(async (raw) => raw.length).optional() },
			payload: { type: t.json().optional() },
			config: { type: t.json<{ a: number }>().optional() },
			parsed: { type: t.json(z.object({ a: z.string().transform(Number) })).optional() },
			dates: { type: t.array(t.custom((raw) => new Date(raw))).optional() },
			email: { type: t.string().check(z.email()).optional() },
			even: {
				type: t
					.int()
					.check((n) => n % 2 === 0 || 'must be even')
					.optional()
			},
			port: { type: t.int(), default: 8080 }
		}
	})
	type Options = typeof r.options
	type Expected = {
		name: string
		size: `${number}px`
		ratio: number
		on: true
		mode: 'fast'
		three: 3
		level: 'debug' | 'info' | 'warn'
		modes: ('a' | 'b')[]
		port: number
		lines?: number
		verbose?: boolean
		ports?: number[]
		when?: Date
		later?: number
		payload?: unknown
		config?: { a: number }
		parsed?: { a: number }
		dates?: Date[]
		email?: string
		even?: number
	}
	assert<Equal<Known<Options>, Expected>>()
	// @ts-expect-error literal(true) is exactly true, not boolean
	assert<Equal<Options['on'], boolean>>()
	// @ts-expect-error an optional key is optional, not a required `| undefined`
	assert<Equal<Known<Options>, Known<Omit<Expected, 'lines'> & { lines: number | undefined }>>>()
	// @ts-expect-error enum is the union, not string
	assert<Equal<Options['level'], string>>()
	// @ts-expect-error array of enum is not string[]
	assert<Equal<Options['modes'], string[]>>()
	// @ts-expect-error a template literal is not a plain string
	assert<Equal<Options['size'], string>>()
	// @ts-expect-error custom infers Date, not unknown
	assert<Equal<Options['when'], unknown>>()
	// @ts-expect-error an async custom infers the resolved type, not the promise
	assert<Equal<Options['later'], Promise<number> | undefined>>()
	// @ts-expect-error .check(z.email()) does not narrow the value
	assert<Equal<Options['email'], `${string}@${string}` | undefined>>()
	// @ts-expect-error t.json(schema) uses the schema output, not its input
	assert<Equal<Options['parsed'], { a: string } | undefined>>()
})

it('keeps the descriptor type through .check()', () => {
	const plain = t.int({ min: 1 })
	const checked = plain.check((n) => n < 10 || 'too big').check(z.number().int())
	assert<Equal<typeof plain, typeof checked>>()
	const branded = t.int().check(Port)
	assert<Equal<typeof branded, typeof plain>>()
})

it('infers declarations written out of line, spread, or held in a variable', () => {
	const decls = {
		format: { type: t.enum(['toon', 'text', 'json']).optional() },
		on: { type: t.literal(true) },
		tags: { type: t.array(t.string()) }
	}
	const r2 = parseArgs({ args: ['--on', '--tags=a'], options: decls })
	assert<Equal<Known<typeof r2.options>, { on: true; tags: string[]; format?: 'toon' | 'text' | 'json' }>>()
	const r3 = parseArgs({ args: ['--on', '--tags=a', '--n=1'], options: { ...decls, n: { type: t.int() } } })
	assert<Equal<(typeof r3.options)['n'], number>>()
	const formatOption = t.enum(['toon', 'json']).optional()
	const r4 = parseArgs({ args: [], options: { format: { type: formatOption } } })
	assert<Equal<Known<typeof r4.options>, { format?: 'toon' | 'json' }>>()
})

it('types parseArgsAsync like parseArgs', async () => {
	const r = await parseArgsAsync({ args: ['--n=1'], options: { n: { type: t.custom(async (raw) => Number(raw)) } } })
	assert<Equal<(typeof r.options)['n'], number>>()
})

it('rejects illegal declarations at the type level', () => {
	expect(() => {
		// @ts-expect-error min is not a string constraint
		t.string({ min: 1 })
		// @ts-expect-error pattern is not a number constraint
		t.number({ pattern: /x/ })
		// @ts-expect-error there is no int flag on t.number
		t.number({ int: true })
		// @ts-expect-error boolean takes no options
		t.boolean({ min: 1 })
		// @ts-expect-error a type assertion on string requires a pattern
		t.string<`${number}px`>()
		// @ts-expect-error check gets the converted value: number has no length
		t.int().check((n) => n.length > 0)
		// @ts-expect-error a default has the descriptor's type
		parseArgs({ args: [], options: { port: { type: t.int(), default: '80' } } })
		// @ts-expect-error a descriptor option collects with t.array, not multiple
		parseArgs({ args: [], options: { port: { type: t.int(), multiple: true } } })
	}).toThrow()
	expect(() => {
		// @ts-expect-error enum must be non-empty
		t.enum([])
	}).toThrow()
	expect(() => {
		const values: string[] = ['a']
		// @ts-expect-error a pre-widened string[] is not a non-empty tuple
		t.enum(values)
	}).not.toThrow()
	expect(() => {
		// @ts-expect-error enum values are strings
		t.enum([1, 2])
	}).toThrow()
	expect(() => {
		// @ts-expect-error literal must be a scalar
		t.literal({ a: 1 })
	}).toThrow()
	expect(() => {
		// @ts-expect-error array element cannot be optional
		t.array(t.string().optional())
	}).toThrow()
	expect(() => {
		// @ts-expect-error no nested arrays
		t.array(t.array(t.string()))
	}).toThrow()
	expect(() => {
		// @ts-expect-error a foreign schema is not an option type
		parseArgs({ args: [], options: { bad: { type: z.string() } } })
	}).toThrow()
	expect(() => {
		// @ts-expect-error plain data is not a descriptor
		parseArgs({ args: [], options: { bad: { type: { kind: 'string', isOptional: false, checks: [] } } } })
	}).toThrow()
})

it('compares a Standard Schema input with the option value', () => {
	// @ts-expect-error a number schema on a string option
	t.string().check(z.number())
	// a wider input is accepted
	t.string().check(z.unknown())
	t.int().check(z.union([z.string(), z.number()]))
	// a narrower input is accepted
	t.string().check(z.enum(['a', 'b']))
	// zod 4's coercion has an unknown input
	t.int().check(z.coerce.number())
})

it('vendors a Standard Schema interface compatible with the published one', () => {
	assert<Equal<StandardSchemaV1<string, number>, PublishedStandardSchemaV1<string, number>>>()
	const d: Descriptor<string, false> = t.string()
	expect(d.kind).toBe('string')
})
