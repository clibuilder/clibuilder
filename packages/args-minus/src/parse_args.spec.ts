import { testType } from 'type-plus'
import { parseArgs, type ParsedArgs } from './index.js'

it('parses empty args', () => {
	expect(parseArgs({ args: [] })).toEqual({
		_: [],
		__: [],
		options: {}
	})
})

it('parses arguments under _ ', () => {
	expect(parseArgs({ args: ['a', 'b'] })).toEqual({
		_: ['a', 'b'],
		__: [],
		options: {}
	})
})

it('parses long option', () => {
	expect(parseArgs({ args: ['--opt'] })).toEqual({
		_: [],
		__: [],
		options: { opt: true }
	})
})

it('parses long option with inline value', () => {
	expect(parseArgs({ args: ['--opt=abc'] })).toEqual({
		_: [],
		__: [],
		options: { opt: 'abc' }
	})
})

it('parses short option', () => {
	expect(parseArgs({ args: ['-abc'] })).toEqual({
		_: [],
		__: [],
		options: { a: true, b: true, c: true }
	})
})

it('parses short option with inline value', () => {
	expect(parseArgs({ args: ['-abc=123'] })).toEqual({
		_: [],
		__: [],
		options: { a: true, b: true, c: '123' }
	})
})

it('supports options with 3 dashes', () => {
	expect(parseArgs({ args: ['---abc'] })).toEqual({
		_: [],
		__: [],
		options: { abc: true }
	})
})

it('keep input after terminator in __', () => {
	expect(parseArgs({ args: ['a', '--', 'b', '-c'] })).toEqual({
		_: ['a'],
		__: ['b', '-c'],
		options: {}
	})
})

it('returns ParsedArgs type', () => {
	const r = parseArgs({ args: [] })
	expect(r.options['p']).toBeUndefined()

	testType.equal<typeof r, ParsedArgs>(true)
})

it('uses the last value if the option is specified multiple times', () => {
	expect(parseArgs({ args: ['-a=1', '-a=2'] })).toEqual({
		_: [],
		__: [],
		options: { a: '2' }
	})
})

it('returns tokens when tokens is true', () => {
	expect(parseArgs({ args: ['-a=1', '-a=2'], tokens: true })).toEqual({
		_: [],
		__: [],
		options: { a: '2' },
		tokens: [
			{
				kind: 'option',
				name: 'a',
				dashes: 1,
				raw: '-a=1',
				index: 0,
				value: '1'
			},
			{
				kind: 'option',
				name: 'a',
				dashes: 1,
				raw: '-a=2',
				index: 1,
				value: '2'
			}
		]
	})
})
