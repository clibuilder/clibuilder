import { testType } from 'type-plus'
import { type ArgsValue, type MultipleArgsValue, ParseArgsError, parseArgs, tokenizeArgs } from './index.js'

it('passes positional arguments into _ ', () => {
	expect(parseArgs({ args: ['a', 'b'] })._).toEqual(['a', 'b'])
})

it('parses long option as boolean', () => {
	expect(parseArgs({ args: ['--opt'] }).options).toEqual({ opt: true })
})

it('parses long option with inline value', () => {
	expect(parseArgs({ args: ['--opt=abc'] }).options).toEqual({ opt: 'abc' })
})

it('by default treats inline value as string', () => {
	expect(parseArgs({ args: ['--opt=123'] }).options).toEqual({ opt: '123' })
	expect(parseArgs({ args: ['--opt=true'] }).options).toEqual({ opt: 'true' })
	expect(parseArgs({ args: ['--opt=false'] }).options).toEqual({ opt: 'false' })
})

it('splits short options into separate options', () => {
	expect(parseArgs({ args: ['-abc'] }).options).toEqual({
		a: true,
		b: true,
		c: true
	})
})

it('assigns the inline value to the last short options', () => {
	expect(parseArgs({ args: ['-abc=123'] }).options).toEqual({
		a: true,
		b: true,
		c: '123'
	})
})

it('keep input after terminator in __', () => {
	expect(parseArgs({ args: ['a', '--', 'b', '-c'] })).toEqual({
		_: ['a'],
		__: ['b', '-c'],
		options: {}
	})
})

it('returns the last value if the option is specified multiple times', () => {
	expect(parseArgs({ args: ['--ab=1', '--ab=2'] }).options).toEqual({ ab: '2' })
	expect(parseArgs({ args: ['-a=1', '-a=2'] }).options).toEqual({ a: '2' })
	expect(parseArgs({ args: ['-ab=1', '-cb=2'] }).options).toEqual({ a: true, b: '2', c: true })
})

it('returns option type as ArgsValue (string | number | boolean)', () => {
	const r = parseArgs({ args: [] })
	testType.equal<(typeof r.options)['p'], ArgsValue | MultipleArgsValue>(true)
	testType.equal<ArgsValue, string | number | boolean>(true)
})

describe('value conversion', () => {
	const options = { n: { type: 'number' }, b: { type: 'boolean' }, s: { type: 'string' } } as const

	it('types declared options by their declaration', () => {
		const r = parseArgs({ args: [], options })
		testType.equal<typeof r.options.n, number | undefined>(true)
		testType.equal<typeof r.options.b, boolean | undefined>(true)
		testType.equal<typeof r.options.s, string | undefined>(true)
	})

	it('converts numbers', () => {
		expect(parseArgs({ args: ['--n=1.5'], options }).options.n).toBe(1.5)
		expect(parseArgs({ args: ['--n=-3'], options }).options.n).toBe(-3)
		expect(parseArgs({ args: ['--n=0x10'], options }).options.n).toBe(16)
	})

	it.each(['abc', '', ' ', 'NaN', 'Infinity', '1x'])('rejects invalid number %j', (v) => {
		expect(() => parseArgs({ args: [`--n=${v}`], options })).toThrow(ParseArgsError)
		expect(() => parseArgs({ args: [`--n=${v}`], options })).toThrow(/option 'n'/)
	})

	it('rejects a number option without a value', () => {
		expect(() => parseArgs({ args: ['--n'], options })).toThrow(/Invalid value for option 'n': a number is required/)
	})

	it('rejects a string option without a value', () => {
		expect(() => parseArgs({ args: ['--s'], options })).toThrow(/Invalid value for option 's': a value is required/)
	})

	it('converts booleans in short groups', () => {
		expect(parseArgs({ args: ['-b=false'], options }).options.b).toBe(false)
		expect(parseArgs({ args: ['-sb=0'], options: { s: { type: 'boolean' }, b: { type: 'boolean' } } }).options).toEqual(
			{
				s: true,
				b: false
			}
		)
	})

	it('converts the last short option by its declaration', () => {
		expect(parseArgs({ args: ['-n=2'], options }).options.n).toBe(2)
		expect(() => parseArgs({ args: ['-n=x'], options })).toThrow(/option 'n'/)
	})

	it('reports the option and the input form in the error', () => {
		const error = (() => {
			try {
				parseArgs({ args: ['--n=abc'], options })
			} catch (e) {
				return e as ParseArgsError
			}
		})()
		expect(error).toBeInstanceOf(ParseArgsError)
		expect(error?.option).toBe('n')
		expect(error?.input).toBe('--n=abc')
		expect(error?.message).toBe("Invalid value for option 'n': abc (from '--n=abc')")
	})
})

it('returns tokens when tokens is true', () => {
	const args = ['-a=1', '-a=2']
	expect(parseArgs({ args, tokens: true }).tokens).toEqual(tokenizeArgs(args))
})

describe('specifying boolean options', () => {
	it('accepts naked boolean option', () => {
		expect(
			parseArgs({
				args: ['--bool'],
				options: { bool: { type: 'boolean' } }
			}).options
		).toEqual({ bool: true })
	})
	it('accepts boolean option with inline value', () => {
		expect(
			parseArgs({
				args: ['--bool=true'],
				options: { bool: { type: 'boolean' } }
			}).options
		).toEqual({ bool: true })
		expect(
			parseArgs({
				args: ['--bool=false'],
				options: { bool: { type: 'boolean' } }
			}).options
		).toEqual({ bool: false })
	})

	it('accept t/f as boolean', () => {
		expect(
			parseArgs({
				args: ['--bool=t'],
				options: { bool: { type: 'boolean' } }
			}).options
		).toEqual({ bool: true })
		expect(
			parseArgs({
				args: ['--bool=f'],
				options: { bool: { type: 'boolean' } }
			}).options
		).toEqual({ bool: false })
	})

	it('accepts 0 as false', () => {
		expect(
			parseArgs({
				args: ['--bool=0'],
				options: { bool: { type: 'boolean' } }
			}).options
		).toEqual({ bool: false })
	})

	it('accepts positive numbers as true', () => {
		expect(
			parseArgs({
				args: ['--bool=1'],
				options: { bool: { type: 'boolean' } }
			}).options
		).toEqual({ bool: true })
	})
	it('accepts negative numbers as false', () => {
		expect(
			parseArgs({
				args: ['--bool=-1'],
				options: { bool: { type: 'boolean' } }
			}).options
		).toEqual({ bool: false })
	})
	it('throws if value is non-recognized value', () => {
		expect(() =>
			parseArgs({
				args: ['--bool=abc'],
				options: { bool: { type: 'boolean' } }
			})
		).toThrow(/Invalid value for option 'bool': abc/)
	})
	it.todo('can override convertion logic')
})

it('can specify the type of options', () => {
	expect(
		parseArgs({
			args: ['--num=1', '--bool=false', '--str=abc'],
			options: { num: { type: 'number' }, bool: { type: 'boolean' }, str: { type: 'string' } }
		})
	).toEqual({
		_: [],
		__: [],
		options: { num: 1, bool: false, str: 'abc' }
	})
})

// single dash is reserved for shortcuts

describe('options that consume the following argument', () => {
	const options = { name: { type: 'string' }, n: { type: 'number' }, b: { type: 'boolean' } } as const

	it('consumes the next argument for a long option', () => {
		expect(parseArgs({ args: ['--name', 'Ada'], options })).toEqual({ _: [], __: [], options: { name: 'Ada' } })
	})

	it('consumes the next argument for a short option and the last option of a group', () => {
		expect(parseArgs({ args: ['-n', '3'], options }).options).toEqual({ n: 3 })
		expect(parseArgs({ args: ['-bn', '3'], options }).options).toEqual({ b: true, n: 3 })
	})

	it('still accepts the inline value', () => {
		expect(parseArgs({ args: ['--name=Ada', 'x'], options })).toEqual({ _: ['x'], __: [], options: { name: 'Ada' } })
	})

	it('keeps positionals in order around the consumed value', () => {
		expect(parseArgs({ args: ['a', '--name', 'Ada', 'b', '--', 'c'], options })).toEqual({
			_: ['a', 'b'],
			__: ['c'],
			options: { name: 'Ada' }
		})
	})

	it('does not consume for boolean or undeclared options', () => {
		expect(parseArgs({ args: ['--b', 'true'], options })).toEqual({ _: ['true'], __: [], options: { b: true } })
		expect(parseArgs({ args: ['--x', 'y'] })).toEqual({ _: ['y'], __: [], options: { x: true } })
	})

	it('treats an option-like next argument as a missing value', () => {
		expect(() => parseArgs({ args: ['--name', '--b'], options })).toThrow(/option 'name': a value is required/)
		expect(() => parseArgs({ args: ['--name', '-x'], options })).toThrow(/option 'name': a value is required/)
	})

	it('treats the terminator as a missing value', () => {
		expect(() => parseArgs({ args: ['--name', '--', 'Ada'], options })).toThrow(/option 'name': a value is required/)
	})

	it('reports a missing value at the end of input', () => {
		expect(() => parseArgs({ args: ['--n'], options })).toThrow(/option 'n': a number is required/)
	})

	it('lets a value that looks like an option be given inline', () => {
		expect(parseArgs({ args: ['--name=--b'], options }).options).toEqual({ name: '--b' })
	})

	it('accepts a negative number as the following value of a number option', () => {
		expect(parseArgs({ args: ['--n', '-5'], options }).options).toEqual({ n: -5 })
		expect(parseArgs({ args: ['--n', '-5.5'], options }).options).toEqual({ n: -5.5 })
	})

	it('keeps the raw tokens unchanged', () => {
		expect(parseArgs({ args: ['--name', 'Ada'], options, tokens: true }).tokens).toEqual(
			tokenizeArgs(['--name', 'Ada'])
		)
	})
})

describe('aliases and short groups', () => {
	const options = {
		name: { type: 'string', alias: 'n' },
		verbose: { type: 'boolean', alias: ['v', 'loud'] },
		count: { type: 'number', alias: 'c' }
	} as const

	it('reports aliases under the canonical key', () => {
		expect(parseArgs({ args: ['-n', 'Ada'], options }).options).toEqual({ name: 'Ada' })
		expect(parseArgs({ args: ['--n=Ada'], options }).options).toEqual({ name: 'Ada' })
		expect(parseArgs({ args: ['--loud'], options }).options).toEqual({ verbose: true })
		expect(parseArgs({ args: ['--name=Ada'], options }).options).toEqual({ name: 'Ada' })
	})

	it('converts through the alias declaration', () => {
		expect(parseArgs({ args: ['-v=false'], options }).options).toEqual({ verbose: false })
		expect(() => parseArgs({ args: ['-c=x'], options })).toThrow(/option 'count'/)
	})

	it('resolves a group against declarations, ending in a value option', () => {
		expect(parseArgs({ args: ['-vn', 'Ada'], options }).options).toEqual({ verbose: true, name: 'Ada' })
		expect(parseArgs({ args: ['-vc=3'], options }).options).toEqual({ verbose: true, count: 3 })
	})

	it('rejects a value option that is not last in a group', () => {
		const run = () => parseArgs({ args: ['-nv'], options })
		expect(run).toThrow(ParseArgsError)
		expect(run).toThrow(/Invalid option group '-nv': 'n' takes a value/)
	})

	it('keeps undeclared short options expanding as booleans', () => {
		expect(parseArgs({ args: ['-vxy'], options }).options).toEqual({ verbose: true, x: true, y: true })
	})

	it('rejects an alias used by two options', () => {
		expect(() =>
			parseArgs({ args: [], options: { a: { type: 'boolean', alias: 'x' }, b: { type: 'boolean', alias: 'x' } } })
		).toThrow(/Alias 'x' of option 'b' is already used by option 'a'/)
		expect(() =>
			parseArgs({ args: [], options: { a: { type: 'boolean' }, b: { type: 'boolean', alias: 'a' } } })
		).toThrow(/already used/)
	})

	it('leaves the tokenizer independent of declarations', () => {
		expect(tokenizeArgs(['-vn', 'Ada'])[0]).toMatchObject({ kind: 'option', name: 'vn', dashes: 1 })
	})
})

describe('repeated options', () => {
	it('is last-wins by default and with multiple: false', () => {
		const options = { a: { type: 'string', multiple: false } } as const
		expect(parseArgs({ args: ['--a=1', '--a=2'], options }).options).toEqual({ a: '2' })
	})

	it('collects values in source order with multiple: true', () => {
		const options = { inc: { type: 'string', multiple: true, alias: 'i' } } as const
		const r = parseArgs({ args: ['--inc=a', '-i', 'b', '--inc', 'c', 'x'], options })
		expect(r.options).toEqual({ inc: ['a', 'b', 'c'] })
		expect(r._).toEqual(['x'])
		testType.equal<typeof r.options.inc, string[] | undefined>(true)
	})

	it('converts each value', () => {
		const options = { n: { type: 'number', multiple: true }, b: { type: 'boolean', multiple: true } } as const
		expect(parseArgs({ args: ['--n=1', '--n', '2', '--b', '--b=false', '-b=0'], options }).options).toEqual({
			n: [1, 2],
			b: [true, false, false]
		})
		expect(() => parseArgs({ args: ['--n=1', '--n=x'], options })).toThrow(/option 'n'/)
	})

	it('leaves a multiple option absent without a default', () => {
		expect(parseArgs({ args: [], options: { n: { type: 'number', multiple: true } } }).options).toEqual({})
	})
})

describe('defaults', () => {
	const options = {
		n: { type: 'number', default: 5 },
		s: { type: 'string', default: 'x' },
		b: { type: 'boolean', default: false },
		inc: { type: 'string', multiple: true, default: ['d'] },
		none: { type: 'string' }
	} as const

	it('applies defaults when the option is absent', () => {
		const r = parseArgs({ args: [], options })
		expect(r.options).toEqual({ n: 5, s: 'x', b: false, inc: ['d'] })
		testType.equal<typeof r.options.n, number>(true)
		testType.equal<typeof r.options.inc, string[]>(true)
		testType.equal<typeof r.options.none, string | undefined>(true)
	})

	it('does not apply defaults when the option is given', () => {
		expect(parseArgs({ args: ['--n=1', '-s', 'y', '--b', '--inc=a'], options }).options).toEqual({
			n: 1,
			s: 'y',
			b: true,
			inc: ['a']
		})
	})

	it('applies defaults through aliases', () => {
		const o = { name: { type: 'string', alias: 'n', default: 'x' } } as const
		expect(parseArgs({ args: ['-n', 'y'], options: o }).options).toEqual({ name: 'y' })
		expect(parseArgs({ args: [], options: o }).options).toEqual({ name: 'x' })
	})

	it('does not share default arrays between calls', () => {
		const a = parseArgs({ args: [], options }).options.inc
		a.push('mutated')
		expect(parseArgs({ args: [], options }).options.inc).toEqual(['d'])
	})

	it('rejects a default of the wrong type', () => {
		// @ts-expect-error number option with a string default
		parseArgs({ args: [], options: { n: { type: 'number', default: 'x' } } })
		// @ts-expect-error scalar option with an array default
		parseArgs({ args: [], options: { n: { type: 'number', default: [1] } } })
	})
})

describe('unknown option policy', () => {
	const options = { name: { type: 'string', alias: 'n' }, v: { type: 'boolean' } } as const

	it('is permissive by default and keeps unknown options and tokens', () => {
		const r = parseArgs({ args: ['--x=1', '-y', 'p'], options, tokens: true })
		expect(r.options).toEqual({ x: '1', y: true })
		expect(r._).toEqual(['p'])
		expect(r.tokens).toEqual(tokenizeArgs(['--x=1', '-y', 'p']))
	})

	it('strict reports an unknown option with its input form', () => {
		const run = () => parseArgs({ args: ['--nope=1'], options, strict: true })
		expect(run).toThrow(ParseArgsError)
		expect(run).toThrow("Unknown option 'nope' (from '--nope=1')")
	})

	it('strict accepts declared names and aliases, long and short', () => {
		expect(parseArgs({ args: ['--name=a', '-n', 'b', '-v'], options, strict: true }).options).toEqual({
			name: 'b',
			v: true
		})
	})

	it('strict checks every option in a short group', () => {
		expect(() => parseArgs({ args: ['-vx'], options, strict: true })).toThrow(/Unknown option 'x' \(from '-vx'\)/)
	})

	it('strict does not check input after the terminator', () => {
		expect(parseArgs({ args: ['--', '--nope'], options, strict: true })).toEqual({
			_: [],
			__: ['--nope'],
			options: {}
		})
	})

	it('strict without declarations rejects every option', () => {
		expect(() => parseArgs({ args: ['--a'], strict: true })).toThrow(/Unknown option 'a'/)
	})

	it('allowPositionals: false rejects positionals before and after the terminator', () => {
		expect(() => parseArgs({ args: ['a'], allowPositionals: false })).toThrow(/Unexpected positional argument 'a'/)
		expect(() => parseArgs({ args: ['--', 'b'], allowPositionals: false })).toThrow(/positional argument 'b'/)
	})

	it('allowPositionals: false still allows values consumed by options', () => {
		expect(parseArgs({ args: ['--name', 'Ada'], options, allowPositionals: false }).options).toEqual({ name: 'Ada' })
	})

	it('positional policy is independent of the unknown-option policy', () => {
		expect(parseArgs({ args: ['a', '--x'], options, strict: false }).options).toEqual({ x: true })
		expect(() => parseArgs({ args: ['a'], options, strict: true })).not.toThrow()
		expect(() => parseArgs({ args: ['--x'], options, allowPositionals: false })).not.toThrow()
	})
})

describe('custom grammar', () => {
	it('uses another modifier for options', () => {
		const r = parseArgs({ args: ['/a', '//name=Ada', '-x', 'p'], grammar: { modifiers: '/' } })
		expect(r.options).toEqual({ a: true, name: 'Ada' })
		expect(r._).toEqual(['-x', 'p'])
	})

	it('accepts several modifiers and counts them together', () => {
		const r = parseArgs({ args: ['+ab', '--long', '-+mix'], grammar: { modifiers: ['-', '+'] } })
		expect(r.options).toEqual({ a: true, b: true, long: true, mix: true })
	})

	it('uses another terminator', () => {
		const r = parseArgs({ args: ['--a', '::', '--b'], grammar: { terminator: '::' } })
		expect(r).toEqual({ _: [], __: ['--b'], options: { a: true } })
	})

	it('treats the default terminator as an option when a custom one is set', () => {
		expect(parseArgs({ args: ['--', 'x'], grammar: { terminator: '::' } })._).toEqual(['--', 'x'])
	})

	it('keeps source indexes and raw text in tokens', () => {
		expect(tokenizeArgs(['/a', '::', '/b'], { modifiers: '/', terminator: '::' })).toEqual([
			{ kind: 'option', index: 0, name: 'a', dashes: 1, raw: '/a', value: undefined },
			{ kind: 'option-terminator', index: 1 },
			{ kind: 'positional', index: 2, value: '/b' }
		])
	})

	it('rejects ambiguous grammar', () => {
		expect(() => tokenizeArgs([], { modifiers: '' })).toThrow(/At least one modifier/)
		expect(() => tokenizeArgs([], { modifiers: '=' })).toThrow(/Invalid modifier/)
		expect(() => tokenizeArgs([], { modifiers: ['--'] })).toThrow(/Invalid modifier/)
		expect(() => tokenizeArgs([], { terminator: '' })).toThrow(/terminator must not be empty/)
	})

	it('keeps the default grammar when none is given', () => {
		expect(tokenizeArgs(['--a', '--', '-b'])).toEqual(
			tokenizeArgs(['--a', '--', '-b'], { modifiers: '-', terminator: '--' })
		)
	})
})
