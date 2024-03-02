import { testType } from 'type-plus'
import { parseArgs, type ArgsValue, tokenizeArgs } from './index.js'

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

it('returns option type as ArgsValue (string | boolean)', () => {
	const r = parseArgs({ args: [] })
	testType.equal<(typeof r.options)['p'], ArgsValue>(true)
	testType.equal<ArgsValue, string | boolean>(true)
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

it.skip('can specify the type of options', () => {
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
