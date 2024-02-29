import { argsStrictParser } from './args_strict_parser.js'

it('parses empty args', () => {
	const parser = argsStrictParser()
	expect(parser.parse([])).toEqual({
		_: [],
		__: []
	})
})

it('parses arguments under _ ', () => {
	const parser = argsStrictParser()
	expect(parser.parse(['a', 'b'])).toEqual({
		_: ['a', 'b'],
		__: []
	})
})

describe('.options()', () => {
	it('throws if option key does not start with -', () => {
		const parser = argsStrictParser()

		expect(() => parser.option('abc')).toThrowError(
			/^Option must starts with one or more dashes \('-'\), received 'abc'.$/
		)
	})

	it('throws if option key only consist of dashes', () => {
		const parser = argsStrictParser()
		expect(() => parser.option('-')).toThrowError(/^Option must starts with one or more dashes \('-'\), received '-'.$/)
	})

	it('parses long option', () => {
		const parser = argsStrictParser().option('--opt')
		expect(parser.parse(['--opt'])).toEqual({
			_: [],
			__: [],
			opt: true
		})
	})

	it('throws if the option is not defined', () => {})
})
