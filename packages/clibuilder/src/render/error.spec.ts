import { command, z } from '../index.js'
import { formatLookupError } from './error.js'

describe('formatLookupError()', () => {
	const cmd = command({
		name: 'cmd',
		arguments: [{ name: 'arg', description: 'an arg', type: z.number() }],
		options: { abc: { description: 'abc', type: z.optional(z.number()) } },
		run() {}
	})

	it('names both conflicting options', () => {
		expect(formatLookupError({ type: 'conflicting-options', key: 'full', conflictsWith: 'n' }, cmd)).toBe(
			'option --full cannot be used with option -n'
		)
	})
	it('names an unknown option', () => {
		expect(formatLookupError({ type: 'invalid-key', key: 'bogus' }, cmd)).toBe('unknown option --bogus')
	})
	it('names an unknown single character option with one dash', () => {
		expect(formatLookupError({ type: 'invalid-key', key: 'x' }, cmd)).toBe('unknown option -x')
	})
	it('leaves an already dashed key alone', () => {
		expect(formatLookupError({ type: 'invalid-key', key: '-help' }, cmd)).toBe('unknown option ---help')
	})
	it('names a missing argument', () => {
		expect(formatLookupError({ type: 'missing-argument', name: 'arg' }, cmd)).toBe('missing required argument <arg>')
	})
	it('names one extra argument', () => {
		expect(formatLookupError({ type: 'extra-arguments', name: 'cmd', values: ['x'] }, cmd)).toBe(
			'unexpected argument: x'
		)
	})
	it('names every extra argument', () => {
		expect(formatLookupError({ type: 'extra-arguments', name: 'cmd', values: ['x', 'y'] }, cmd)).toBe(
			'unexpected arguments: x, y'
		)
	})
	it('names an invalid option value', () => {
		expect(
			formatLookupError({ type: 'invalid-value', key: 'abc', value: 'xyz', message: 'expected to be number' }, cmd)
		).toBe('invalid value for option --abc: expected to be number, received "xyz"')
	})
	it('names an invalid argument value', () => {
		expect(
			formatLookupError({ type: 'invalid-value', key: 'arg', value: 'xyz', message: 'expected to be number' }, cmd)
		).toBe('invalid value for argument <arg>: expected to be number, received "xyz"')
	})
	it('names an option given too many values', () => {
		expect(formatLookupError({ type: 'expect-single', key: 'abc', keyType: z.number(), value: ['1', '2'] }, cmd)).toBe(
			'option --abc expects a single value, received: 1, 2'
		)
	})
	it('reports a single value for an option given too many values', () => {
		expect(formatLookupError({ type: 'expect-single', key: 'abc', keyType: z.number(), value: '1' }, cmd)).toBe(
			'option --abc expects a single value, received: 1'
		)
	})
})
