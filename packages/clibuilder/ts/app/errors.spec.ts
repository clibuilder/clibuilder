import { CliError, exitCodes, isCliError } from './errors.js'

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
