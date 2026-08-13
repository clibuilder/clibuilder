import { CliError, exitCodes, formatLookupError, isCliError } from './errors.js'
import { command, z } from './index.js'

describe('exitCodes', () => {
	it('follows the AXI convention', () => {
		expect(exitCodes).toEqual({ success: 0, error: 1, usage: 2 })
	})
})

describe('CliError', () => {
	it('defaults to the generic error code', () => {
		const err = new CliError('boom')
		expect(err.message).toBe('boom')
		expect(err.exitCode).toBe(exitCodes.error)
		expect(err.help).toEqual([])
	})
	it('accepts an exit code', () => {
		expect(new CliError('boom', { exitCode: exitCodes.usage }).exitCode).toBe(2)
	})
	it('accepts a single help line', () => {
		expect(new CliError('boom', { help: 'try this' }).help).toEqual(['try this'])
	})
	it('accepts multiple help lines', () => {
		expect(new CliError('boom', { help: ['a', 'b'] }).help).toEqual(['a', 'b'])
	})
	it('is an Error', () => {
		const err = new CliError('boom')
		expect(err).toBeInstanceOf(Error)
		expect(err.name).toBe('CliError')
		expect(err.stack).toBeDefined()
	})
	it('keeps the cause', () => {
		const cause = new Error('inner')
		expect(new CliError('boom', { cause }).cause).toBe(cause)
	})
})

describe('isCliError()', () => {
	it('recognizes a CliError', () => {
		expect(isCliError(new CliError('boom'))).toBe(true)
	})
	it('recognizes a CliError from another copy of clibuilder', () => {
		// a duplicated `clibuilder` in the dependency tree means `instanceof` fails,
		// so the check is on the brand, not the prototype chain.
		const foreign = Object.assign(new Error('boom'), {
			[Symbol.for('clibuilder.CliError')]: true,
			exitCode: 2,
			help: []
		})
		expect(isCliError(foreign)).toBe(true)
	})
	it('rejects a plain error', () => {
		expect(isCliError(new Error('boom'))).toBe(false)
	})
	it('rejects a non-error', () => {
		expect(isCliError(undefined)).toBe(false)
		expect(isCliError('boom')).toBe(false)
	})
})

describe('formatLookupError()', () => {
	const cmd = command({
		name: 'cmd',
		arguments: [{ name: 'arg', description: 'an arg', type: z.number() }],
		options: { abc: { description: 'abc', type: z.optional(z.number()) } },
		run() {}
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
