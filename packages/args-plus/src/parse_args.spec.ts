import { testType } from 'type-plus'
import { parseArgs, type ParsedArgs } from './index.js'

it('parses empty args', () => {
	expect(parseArgs([])).toEqual({
		_: [],
		__: []
	})
})

it('parses arguments under _ ', () => {
	expect(parseArgs(['a', 'b'])).toEqual({
		_: ['a', 'b'],
		__: []
	})
})

it('parses long option', () => {
	expect(parseArgs(['--opt'])).toEqual({
		_: [],
		__: [],
		opt: true
	})
})

it('parses long option with inline value', () => {
	expect(parseArgs(['--opt=abc'])).toEqual({
		_: [],
		__: [],
		opt: 'abc'
	})
})

it('parses short option', () => {
	expect(parseArgs(['-abc'])).toEqual({
		_: [],
		__: [],
		a: true,
		b: true,
		c: true
	})
})

it('parses short option with inline value', () => {
	expect(parseArgs(['-abc=123'])).toEqual({
		_: [],
		__: [],
		a: true,
		b: true,
		c: '123'
	})
})

it('supports options with 3 dashes', () => {
	expect(parseArgs(['---abc'])).toEqual({
		_: [],
		__: [],
		abc: true
	})
})

it('keep input after terminator in __', () => {
	expect(parseArgs(['a', '--', 'b', '-c'])).toEqual({
		_: ['a'],
		__: ['b', '-c']
	})
})

it('returns ParsedArgs type', () => {
	const r = parseArgs([])
	expect(r['p']).toBeUndefined()

	testType.equal<typeof r, ParsedArgs>(true)
})
