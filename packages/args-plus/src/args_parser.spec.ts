import { testType } from 'type-plus'
import { argsParser, type ParsedArgs } from './index.js'

it('parses empty args', () => {
	const parser = argsParser()
	expect(parser.parse([])).toEqual({
		_: [],
		__: []
	})
})

it('parses arguments under _ ', () => {
	const parser = argsParser()
	expect(parser.parse(['a', 'b'])).toEqual({
		_: ['a', 'b'],
		__: []
	})
})

it('parses long option', () => {
	const parser = argsParser()
	expect(parser.parse(['--opt'])).toEqual({
		_: [],
		__: [],
		opt: true
	})
})

it('parses long option with inline value', () => {
	const parser = argsParser()
	expect(parser.parse(['--opt=abc'])).toEqual({
		_: [],
		__: [],
		opt: 'abc'
	})
})

it('parses short option', () => {
	const parser = argsParser()
	expect(parser.parse(['-abc'])).toEqual({
		_: [],
		__: [],
		a: true,
		b: true,
		c: true
	})
})

it('parses short option with inline value', () => {
	const parser = argsParser()
	expect(parser.parse(['-abc=123'])).toEqual({
		_: [],
		__: [],
		a: true,
		b: true,
		c: '123'
	})
})

it('supports options with 3 dashes', () => {
	const parser = argsParser()
	expect(parser.parse(['---abc'])).toEqual({
		_: [],
		__: [],
		abc: true
	})
})

it('keep input after terminator in __', () => {
	const parser = argsParser()
	expect(parser.parse(['a', '--', 'b', '-c'])).toEqual({
		_: ['a'],
		__: ['b', '-c']
	})
})

it('returns ParsedArgs type', () => {
	const parser = argsParser()
	const r = parser.parse([])
	expect(r['p']).toBeUndefined()

	testType.equal<typeof r, ParsedArgs>(true)
})
