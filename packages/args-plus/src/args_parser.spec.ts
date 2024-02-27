import { argsParser } from './index.js'

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
