import { testType } from 'type-plus'
import { type ArgsValue, ParseArgsError, parseArgs, tokenizeArgs } from './index.js'

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
	testType.equal<(typeof r.options)['p'], ArgsValue>(true)
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
	it.todo('can define default value')
	it.todo('can define default value as function')
	it.todo('can support multiple values')
	it.todo('infers type from default value')
	it.todo('throws if one of the multiple values is invalid')
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

it.todo('throws error when unknown option is provided when options is specified')

it.todo('allows unknown option when strict is false')

it.todo('can specify option to accept multiple values through multiple: true')

it.todo('infers option type and multiple from default value')
// single dash is reserved for shortcuts

it.todo('can override the option modifier from dash to something else')

it.todo('can override the option terminator from double dash to something else')

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
