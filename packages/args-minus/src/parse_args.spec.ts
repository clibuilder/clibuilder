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

it.todo('throws when combined shortcut options is not boolean except the last one')

it.todo('gets value from positional?')

it.todo('can specify option to accept multiple values through multiple: true')

it.todo('infers option type and multiple from default value')
// single dash is reserved for shortcuts
// support alias?

it.todo('can override the option modifier from dash to something else')

it.todo('can override the option terminator from double dash to something else')
