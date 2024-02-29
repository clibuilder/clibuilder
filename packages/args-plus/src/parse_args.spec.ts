import { testType } from 'type-plus'
import { parseArgs, type ParsedArgs } from './index.js'

it('parses empty args', () => {
	expect(parseArgs({ args: [] })).toEqual({
		_: [],
		__: []
	})
})

it('parses arguments under _ ', () => {
	expect(parseArgs({ args: ['a', 'b'] })).toEqual({
		_: ['a', 'b'],
		__: []
	})
})

it('parses long option', () => {
	expect(parseArgs({ args: ['--opt'] })).toEqual({
		_: [],
		__: [],
		opt: true
	})
})

it('parses long option with inline value', () => {
	expect(parseArgs({ args: ['--opt=abc'] })).toEqual({
		_: [],
		__: [],
		opt: 'abc'
	})
})

it('parses short option', () => {
	expect(parseArgs({ args: ['-abc'] })).toEqual({
		_: [],
		__: [],
		a: true,
		b: true,
		c: true
	})
})

it('parses short option with inline value', () => {
	expect(parseArgs({ args: ['-abc=123'] })).toEqual({
		_: [],
		__: [],
		a: true,
		b: true,
		c: '123'
	})
})

it('supports options with 3 dashes', () => {
	expect(parseArgs({ args: ['---abc'] })).toEqual({
		_: [],
		__: [],
		abc: true
	})
})

it('keep input after terminator in __', () => {
	expect(parseArgs({ args: ['a', '--', 'b', '-c'] })).toEqual({
		_: ['a'],
		__: ['b', '-c']
	})
})

it('returns ParsedArgs type', () => {
	const r = parseArgs({ args: [] })
	expect(r['p']).toBeUndefined()

	testType.equal<typeof r, ParsedArgs>(true)
})

it('uses the last value if the option is specified multiple times', () => {
	expect(parseArgs({ args: ['-a=1', '-a=2'] })).toEqual({
		_: [],
		__: [],
		a: '2'
	})
})
