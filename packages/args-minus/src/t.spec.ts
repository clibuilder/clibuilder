import { z } from 'zod'
import { isDescriptor, type OptionDeclarations, ParseArgsError, parseArgs, parseArgsAsync, t } from './index.js'

function errorOf(fn: () => unknown) {
	try {
		fn()
	} catch (e) {
		return e as ParseArgsError
	}
	throw new Error('expected a throw')
}

async function rejectionOf(promise: Promise<unknown>) {
	try {
		await promise
	} catch (e) {
		return e as ParseArgsError
	}
	throw new Error('expected a rejection')
}

function parse(args: string[], options: OptionDeclarations) {
	return parseArgs({ args, options }).options
}

describe('descriptor data', () => {
	it('is plain, readable, read-only data keyed on kind', () => {
		const port = t.int({ min: 1, max: 65535 })
		expect({ ...port }).toEqual({ kind: 'int', min: 1, max: 65535, isOptional: false, checks: [] })
		expect(Object.isFrozen(port)).toBe(true)
		expect({ ...t.string() }).toEqual({ kind: 'string', isOptional: false, checks: [] })
		expect({ ...t.string({ pattern: /^v/ }) }).toEqual({ kind: 'string', pattern: /^v/, isOptional: false, checks: [] })
		expect({ ...t.number() }).toEqual({ kind: 'number', isOptional: false, checks: [] })
		expect({ ...t.boolean() }).toEqual({ kind: 'boolean', isOptional: false, checks: [] })
		expect({ ...t.literal(3) }).toEqual({ kind: 'literal', value: 3, isOptional: false, checks: [] })
		expect({ ...t.enum(['a', 'b']) }).toEqual({ kind: 'enum', values: ['a', 'b'], isOptional: false, checks: [] })
		expect({ ...t.json() }).toEqual({ kind: 'json', isOptional: false, checks: [] })
		const schema = z.object({ a: z.number() })
		expect(t.json(schema).schema).toBe(schema)
		const convert = (raw: string) => raw
		expect(t.custom(convert).convert).toBe(convert)
		const element = t.int()
		expect(t.array(element).element).toBe(element)
	})

	it('records optional and checks without changing the original', () => {
		const base = t.string()
		const fn = (v: string) => v !== ''
		const schema = z.string()
		const derived = base.optional().check(fn).check(schema)
		expect(base.isOptional).toBe(false)
		expect(base.checks).toEqual([])
		expect(derived.isOptional).toBe(true)
		expect(derived.checks).toEqual([
			{ type: 'fn', fn },
			{ type: 'schema', schema }
		])
		expect(isDescriptor(derived)).toBe(true)
		expect(isDescriptor({ ...derived })).toBe(false)
	})

	it('checks definitions when they are created', () => {
		expect(() => t.number({ min: 2, max: 1 })).toThrow(/min \(2\) is greater than max \(1\)/)
		expect(() => t.int({ min: 2, max: 1 })).toThrow(RangeError)
		expect(() => t.int({ min: 1.5 })).toThrow(/min must be an integer/)
		expect(() => t.int({ max: 0.5 })).toThrow(/max must be an integer/)
		expect(() => t.number({ min: Number.NaN })).toThrow(/min must be a number/)
		expect(() => t.number({ min: Number.NEGATIVE_INFINITY, max: Number.POSITIVE_INFINITY })).not.toThrow()
		expect(() => t.enum([] as never)).toThrow(/non-empty/)
		expect(() => t.enum([1] as never)).toThrow(/strings/)
		expect(() => t.literal({} as never)).toThrow(/t.literal/)
		expect(() => t.literal(Number.NaN)).toThrow(/t.literal/)
		expect(() => t.string({ pattern: 'x' as never })).toThrow(/RegExp/)
		expect(() => t.array({ kind: 'string' } as never)).toThrow(/must be a descriptor/)
		expect(() => t.array(t.string().optional() as never)).toThrow(/optional/)
		expect(() => t.array(t.array(t.string()) as never)).toThrow(/array/)
		expect(() => t.custom('x' as never)).toThrow(/function/)
		expect(() => t.json({} as never)).toThrow(/Standard Schema/)
		expect(() => t.string().check(42 as never)).toThrow(/function or a Standard Schema/)
	})
})

describe('conversion', () => {
	it('converts strings, with an optional pattern', () => {
		expect(parse(['--s', 'abc'], { s: { type: t.string() } })).toEqual({ s: 'abc' })
		expect(parse(['--v=v12'], { v: { type: t.string({ pattern: /^v\d+$/g }) } })).toEqual({ v: 'v12' })
		expect(parse(['--v=v12'], { v: { type: t.string({ pattern: /^v\d+$/g }) } })).toEqual({ v: 'v12' })
		const error = errorOf(() => parse(['--v=x'], { v: { type: t.string({ pattern: /^v\d+$/ }) } }))
		expect(error).toBeInstanceOf(ParseArgsError)
		expect(error.kind).toBe('invalid-value')
		expect(error.message).toBe(
			"Invalid value for option 'v': expected a string matching /^v\\d+$/, got 'x' (from '--v=x')"
		)
	})

	it('reports a missing value', () => {
		const error = errorOf(() => parse(['--s'], { s: { type: t.string() } }))
		expect(error.kind).toBe('missing-value')
		expect(error.message).toBe("Invalid value for option 's': a value is required (from '--s')")
	})

	it('converts numbers strictly', () => {
		const options = { n: { type: t.number({ min: -1, max: 1 }) } }
		expect(parse(['--n=0.5'], options)).toEqual({ n: 0.5 })
		expect(parse(['--n', '-1'], options)).toEqual({ n: -1 })
		for (const bad of ['', ' ', 'NaN', 'Infinity', '1x', '2']) {
			const error = errorOf(() => parse([`--n=${bad}`], options))
			expect(error.kind).toBe('invalid-value')
			expect(error.message).toContain('expected a number from -1 to 1')
		}
		expect(errorOf(() => parse(['--n=x'], { n: { type: t.number({ min: 0 }) } })).message).toContain(
			'a number of at least 0'
		)
		expect(errorOf(() => parse(['--n=x'], { n: { type: t.number({ max: 0 }) } })).message).toContain(
			'a number of at most 0'
		)
		expect(errorOf(() => parse(['--n=x'], { n: { type: t.number() } })).message).toContain("expected a number, got 'x'")
	})

	it('converts integers', () => {
		const options = { port: { type: t.int({ min: 1, max: 65535 }) } }
		expect(parse(['--port=80'], options)).toEqual({ port: 80 })
		expect(errorOf(() => parse(['--port=1.5'], options)).message).toContain('expected an integer from 1 to 65535')
		expect(errorOf(() => parse(['--port=0'], options)).message).toContain("got '0'")
		expect(errorOf(() => parse(['--port=x'], { port: { type: t.int() } })).message).toContain('expected an integer,')
	})

	it('converts a boolean flag, which takes no value', () => {
		const options = { dry: { type: t.boolean() }, v: { type: t.boolean().optional() } }
		expect(parse(['--dry', 'file'], options)).toEqual({ dry: true })
		expect(parse(['--dry=false'], options)).toEqual({ dry: false })
		expect(parse(['--dry=true'], options)).toEqual({ dry: true })
		expect(parse(['-vd'], { ...options, dry: { ...options.dry, alias: 'd' } })).toEqual({ dry: true, v: true })
		expect(errorOf(() => parse(['--dry=yes'], options)).message).toBe(
			"Invalid value for option 'dry': expected no value, true or false, got 'yes' (from '--dry=yes')"
		)
	})

	it('converts literals', () => {
		expect(parse(['--on'], { on: { type: t.literal(true) } })).toEqual({ on: true })
		expect(errorOf(() => parse(['--on=false'], { on: { type: t.literal(true) } })).message).toContain(
			"expected true, got 'false'"
		)
		expect(errorOf(() => parse(['--off'], { off: { type: t.literal(false) } })).message).toContain(
			'expected false, got no value'
		)
		expect(parse(['--off=false'], { off: { type: t.literal(false) } })).toEqual({ off: false })
		expect(parse(['--m', 'fast'], { m: { type: t.literal('fast') } })).toEqual({ m: 'fast' })
		expect(errorOf(() => parse(['--m=slow'], { m: { type: t.literal('fast') } })).message).toContain("expected 'fast'")
		expect(parse(['--three', '3'], { three: { type: t.literal(3) } })).toEqual({ three: 3 })
		expect(parse(['--neg', '-3'], { neg: { type: t.literal(-3) } })).toEqual({ neg: -3 })
		expect(errorOf(() => parse(['--three=4'], { three: { type: t.literal(3) } })).message).toContain('expected 3')
	})

	it('converts enums', () => {
		const options = { level: { type: t.enum(['debug', 'info']) } }
		expect(parse(['--level', 'info'], options)).toEqual({ level: 'info' })
		expect(errorOf(() => parse(['--level=warn'], options)).message).toContain(
			"expected one of 'debug', 'info', got 'warn'"
		)
	})

	it('reports a required option that is absent', () => {
		const error = errorOf(() => parse([], { name: { type: t.string() } }))
		expect(error.kind).toBe('missing-option')
		expect(error.option).toBe('name')
		expect(error.input).toBe('')
		expect(error.message).toBe("Missing required option 'name'")
		expect(parse([], { name: { type: t.string().optional() } })).toEqual({})
		expect(parse([], { name: { type: t.string(), default: 'x' } })).toEqual({ name: 'x' })
	})

	it('rejects multiple with a descriptor', () => {
		expect(() => parse([], { n: { type: t.int(), multiple: true } as never })).toThrow(/use t.array/)
	})
})

describe('t.array', () => {
	it('collects every occurrence, each converted by the element', () => {
		const options = { port: { type: t.array(t.int({ min: 1 })), alias: 'p' } }
		expect(parse(['--port=1', '-p', '2', '--port', '3'], options)).toEqual({ port: [1, 2, 3] })
	})

	it('names the failing element by its index', () => {
		const error = errorOf(() =>
			parse(['--tag=a', '--tag=b', '--tag=0'], { tag: { type: t.array(t.enum(['a', 'b'])) } })
		)
		expect(error.kind).toBe('invalid-value')
		expect(error.option).toBe('tag')
		expect(error.index).toBe(2)
		expect(error.message).toBe("Invalid value for option 'tag[2]': expected one of 'a', 'b', got '0' (from '--tag=0')")
	})

	it('accepts flag, custom and json elements', () => {
		expect(parse(['-vvv'], { v: { type: t.array(t.boolean()) } })).toEqual({ v: [true, true, true] })
		expect(parse(['--d=1', '--d=22'], { d: { type: t.array(t.custom((raw) => raw.length)) } })).toEqual({ d: [1, 2] })
		expect(parse(['--j=1', '--j={"a":1}'], { j: { type: t.array(t.json()) } })).toEqual({ j: [1, { a: 1 }] })
		const error = errorOf(() =>
			parse(['--d=1', '--d=x'], {
				d: {
					type: t.array(
						t.custom((raw) => {
							if (raw === 'x') throw new Error('is not a digit')
							return raw
						})
					)
				}
			})
		)
		expect(error.message).toBe("Invalid value for option 'd[1]': is not a digit (from '--d=x')")
	})

	it('runs element checks per element and array checks on the whole array', () => {
		const options = {
			n: {
				type: t
					.array(t.int().check((n) => n > 0 || 'must be positive'))
					.check((list) => list.length <= 2 || 'at most two')
			}
		}
		expect(parse(['--n=1', '--n=2'], options)).toEqual({ n: [1, 2] })
		expect(errorOf(() => parse(['--n=1', '--n=-1'], options)).message).toBe(
			"Invalid value for option 'n[1]': must be positive (from '--n=-1')"
		)
		const error = errorOf(() => parse(['--n=1', '--n=2', '--n=3'], options))
		expect(error.message).toBe("Invalid value for option 'n': at most two (from '--n=1 --n=2 --n=3')")
		expect(error.index).toBeUndefined()
	})

	it('copies an array default', () => {
		const fallback = ['a'] as const
		const result = parse([], { tag: { type: t.array(t.string()), default: fallback } })
		expect(result).toEqual({ tag: ['a'] })
		expect(result['tag']).not.toBe(fallback)
	})
})

describe('.check()', () => {
	it('passes on true or nothing, and fails on false or a message', () => {
		const pass = {
			n: {
				type: t
					.int()
					.check(() => true)
					.check(() => undefined)
			}
		}
		expect(parse(['--n=1'], pass)).toEqual({ n: 1 })
		const generic = errorOf(() => parse(['--n=1'], { n: { type: t.int().check(() => false) } }))
		expect(generic.kind).toBe('invalid-value')
		expect(generic.message).toBe("Invalid value for option 'n': failed a check (from '--n=1')")
		expect(errorOf(() => parse(['--n=1'], { n: { type: t.int().check(() => 'must be even') } })).message).toBe(
			"Invalid value for option 'n': must be even (from '--n=1')"
		)
	})

	it('runs in declaration order and stops at the first failure', () => {
		const calls: string[] = []
		const type = t
			.string()
			.check(() => (calls.push('a'), 'first'))
			.check(() => (calls.push('b'), 'second'))
		expect(errorOf(() => parse(['--s=x'], { s: { type } })).message).toContain('first')
		expect(calls).toEqual(['a'])
	})

	it('runs on the converted value', () => {
		let seen: unknown
		parse(['--n=42'], {
			n: {
				type: t.int().check((n) => {
					seen = n
				})
			}
		})
		expect(seen).toBe(42)
	})

	it('maps Standard Schema issues into its own message and ignores the output', () => {
		const options = { email: { type: t.string().check(z.email().transform(() => 'changed')) } }
		expect(parse(['--email=a@b.co'], options)).toEqual({ email: 'a@b.co' })
		const error = errorOf(() => parse(['--email=nope'], options))
		expect(error.kind).toBe('invalid-value')
		expect(error.message).toBe("Invalid value for option 'email': failed a check (from '--email=nope')")
		expect(error.issues?.length).toBeGreaterThan(0)
	})

	it('propagates a check that throws', () => {
		const type = t.string().check(() => {
			throw new Error('bug')
		})
		const error = errorOf(() => parse(['--s=x'], { s: { type } }))
		expect(error).not.toBeInstanceOf(ParseArgsError)
		expect(error.message).toBe('bug')
	})
})

describe('t.custom', () => {
	it('converts with the function', () => {
		expect(parse(['--when=2020-01-02'], { when: { type: t.custom((raw) => new Date(raw)) } })).toEqual({
			when: new Date('2020-01-02')
		})
	})

	it('reports a plain Error as an invalid value', () => {
		const type = t.custom((raw) => {
			throw new Error(`'${raw}' is not a duration`)
		})
		const error = errorOf(() => parse(['--d=1x'], { d: { type } }))
		expect(error).toBeInstanceOf(ParseArgsError)
		expect(error.kind).toBe('invalid-value')
		expect(error.message).toBe("Invalid value for option 'd': '1x' is not a duration (from '--d=1x')")
	})

	it('propagates any other throw', () => {
		class VendorError extends Error {}
		for (const thrown of [new TypeError('bug'), new VendorError('vendor'), 'text']) {
			const type = t.custom(() => {
				throw thrown
			})
			expect(errorOf(() => parse(['--d=1'], { d: { type } }))).toBe(thrown)
		}
	})
})

describe('t.json', () => {
	it('parses JSON text', () => {
		expect(parse(['--p={"a":[1]}'], { p: { type: t.json() } })).toEqual({ p: { a: [1] } })
		const error = errorOf(() => parse(['--p={a'], { p: { type: t.json() } }))
		expect(error.kind).toBe('invalid-value')
		expect(error.message).toBe("Invalid value for option 'p': '{a' is not valid JSON (from '--p={a')")
	})

	it('validates with a schema and uses its output', () => {
		const options = { p: { type: t.json(z.object({ n: z.string().transform(Number) })) } }
		expect(parse(['--p={"n":"2"}'], options)).toEqual({ p: { n: 2 } })
		const error = errorOf(() => parse(['--p={"n":2}'], options))
		expect(error.kind).toBe('invalid-value')
		expect(error.message).toBe("Invalid value for option 'p': does not match the expected shape (from '--p={\"n\":2}')")
		expect(error.issues?.length).toBeGreaterThan(0)
		expect(error.message).not.toContain(error.issues![0]!.message)
	})
})

describe('async', () => {
	const later = <T>(value: T) => new Promise<T>((resolve) => setTimeout(() => resolve(value), 1))

	it('parseArgs throws when a converter or check returns a promise', () => {
		expect(() => parse(['--d=1'], { d: { type: t.custom(async (raw) => raw) } })).toThrow(
			"Option 'd' has an asynchronous converter or check: use parseArgsAsync() to parse it"
		)
		expect(() => parse(['--d=1'], { d: { type: t.string().check(async () => true) } })).toThrow(/parseArgsAsync/)
		const rejected = t.custom(() => Promise.reject(new Error('x')))
		expect(() => parse(['--d=1'], { d: { type: rejected } })).toThrow(/parseArgsAsync/)
	})

	it('parseArgsAsync awaits converters and checks in order', async () => {
		const calls: string[] = []
		const result = await parseArgsAsync({
			args: ['--a=1', '--b=2'],
			options: {
				a: { type: t.custom(async (raw) => (calls.push(`a${raw}`), Number(await later(raw)))) },
				b: { type: t.int().check(async (n) => (calls.push(`b${n}`), later(n === 2))) },
				c: { type: t.json(z.string().refine(async () => true)).optional() }
			}
		})
		expect(result.options).toEqual({ a: 1, b: 2 })
		expect(calls).toEqual(['a1', 'b2'])
	})

	it('parseArgsAsync handles everything parseArgs does', async () => {
		const result = await parseArgsAsync({ args: ['x', '--n=1', '--', 'y'], options: { n: { type: 'number' } } })
		expect(result).toEqual({ _: ['x'], __: ['y'], options: { n: 1 } })
	})

	it('maps a rejection with a plain Error to an invalid value', async () => {
		const type = t.custom(async () => {
			throw new Error('is not reachable')
		})
		const error = await rejectionOf(parseArgsAsync({ args: ['--u=x'], options: { u: { type } } }))
		expect(error).toBeInstanceOf(ParseArgsError)
		expect(error.message).toBe("Invalid value for option 'u': is not reachable (from '--u=x')")
	})

	it('propagates any other rejection', async () => {
		const bug = new TypeError('bug')
		const type = t.custom(() => Promise.reject(bug))
		expect(await rejectionOf(parseArgsAsync({ args: ['--u=x'], options: { u: { type } } }))).toBe(bug)
	})

	it('awaits an async Standard Schema in a check', async () => {
		const options = { s: { type: t.string().check(z.string().refine(async (v) => v === 'ok')) } }
		expect((await parseArgsAsync({ args: ['--s=ok'], options })).options).toEqual({ s: 'ok' })
		const error = await rejectionOf(parseArgsAsync({ args: ['--s=no'], options }))
		expect(error.message).toBe("Invalid value for option 's': failed a check (from '--s=no')")
	})
})

describe('default', () => {
	it('is not converted, and its checks run at the first parse only', () => {
		let calls = 0
		const options = {
			n: {
				type: t.int({ min: 10 }).check(() => {
					calls++
				}),
				default: 1
			}
		}
		expect(parse([], options)).toEqual({ n: 1 })
		expect(parse([], options)).toEqual({ n: 1 })
		expect(calls).toBe(1)
	})

	it('reports a failing check on a default as a programmer error', () => {
		const error = errorOf(() => parse([], { n: { type: t.int().check(() => 'must be even'), default: 1 } }))
		expect(error).not.toBeInstanceOf(ParseArgsError)
		expect(error.message).toBe("The default of option 'n' failed a check: must be even")
		expect(errorOf(() => parse([], { n: { type: t.int().check(() => false), default: 1 } })).message).toBe(
			"The default of option 'n' failed a check"
		)
		const elements = { tag: { type: t.array(t.string().check((s) => s !== '' || 'is empty')), default: ['a', ''] } }
		expect(errorOf(() => parse([], elements)).message).toBe("The default of option 'tag[1]' failed a check: is empty")
	})

	it('needs parseArgsAsync for an async check on a default', async () => {
		const options = { n: { type: t.int().check(async () => true), default: 1 } }
		expect(() => parse([], options)).toThrow(/parseArgsAsync/)
		expect((await parseArgsAsync({ args: [], options })).options).toEqual({ n: 1 })
	})
})
