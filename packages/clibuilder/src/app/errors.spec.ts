import { CliError, exitCodes, isCliError, isReportedCliError } from './errors.js'

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
	it('defaults to the code `error` and no details', () => {
		const err = new CliError('boom')
		expect(err.code).toBe('error')
		expect(err.details).toEqual({})
	})
	it('accepts a code and details', () => {
		const err = new CliError('boom', { code: 'not-found', details: { name: 'foo', candidates: ['a', 'b'] } })
		expect(err.code).toBe('not-found')
		expect(err.details).toEqual({ name: 'foo', candidates: ['a', 'b'] })
	})
	it('accepts the whole report as one object', () => {
		const cause = new Error('inner')
		const err = new CliError({ message: 'boom', code: 'not-found', details: { n: 1 }, help: 'h', exitCode: 7, cause })
		expect(err.message).toBe('boom')
		expect(err.code).toBe('not-found')
		expect(err.details).toEqual({ n: 1 })
		expect(err.help).toEqual(['h'])
		expect(err.exitCode).toBe(7)
		expect(err.cause).toBe(cause)
	})
	it('accepts any exit code from 1 to 255', () => {
		expect(new CliError('boom', { exitCode: 1 }).exitCode).toBe(1)
		expect(new CliError('boom', { exitCode: 255 }).exitCode).toBe(255)
	})
	it('rejects an exit code of 0, since an error must not exit 0', () => {
		expect(() => new CliError('boom', { exitCode: 0 })).toThrow(RangeError)
	})
	it('rejects an exit code outside 1 to 255 or not an integer', () => {
		for (const exitCode of [-1, 256, 1.5, Number.NaN]) {
			expect(() => new CliError('boom', { exitCode })).toThrow('CliError exitCode must be an integer from 1 to 255')
		}
	})
	it('rejects a code that is not kebab-case', () => {
		for (const code of ['', 'NotFound', 'not_found', 'not-', '-found', 'not found']) {
			expect(() => new CliError('boom', { code })).toThrow('CliError code must be a kebab-case string')
		}
	})
	it('rejects a details key it renders under', () => {
		for (const key of ['error', 'code', 'help']) {
			expect(() => new CliError('boom', { details: { [key]: 'x' } })).toThrow(`may not have the key "${key}"`)
		}
	})
	it('copies the details and help it is given', () => {
		const details = { a: 1 }
		const help = ['h']
		const err = new CliError('boom', { details, help })
		details.a = 2
		help.push('i')
		expect(err.details).toEqual({ a: 1 })
		expect(err.help).toEqual(['h'])
	})
	it('can be subclassed', () => {
		class NotFoundError extends CliError {
			constructor(name: string) {
				super(`no plugin named ${name}`, { code: 'not-found', details: { name } })
			}
		}
		const err = new NotFoundError('foo')
		expect(isCliError(err)).toBe(true)
		expect(err).toBeInstanceOf(CliError)
		expect(err.code).toBe('not-found')
		expect(err.exitCode).toBe(exitCodes.error)
	})
})

describe('CliError.reported()', () => {
	it('carries the exit code and is marked as already reported', () => {
		const err = CliError.reported(4)
		expect(isCliError(err)).toBe(true)
		expect(err.exitCode).toBe(4)
		expect(isReportedCliError(err)).toBe(true)
	})
	it('defaults to the error exit code', () => {
		expect(CliError.reported().exitCode).toBe(exitCodes.error)
	})
	it('keeps a message for a caller that reads it', () => {
		expect(CliError.reported(1, 'boom').message).toBe('boom')
	})
	it('rejects an exit code of 0', () => {
		expect(() => CliError.reported(0)).toThrow(RangeError)
	})
	it('is not how a plain CliError is marked', () => {
		expect(isReportedCliError(new CliError('boom'))).toBe(false)
	})
	it('is recognized from another copy of clibuilder', () => {
		const foreign = Object.assign(new Error('x'), {
			[Symbol.for('clibuilder.CliError')]: true,
			[Symbol.for('clibuilder.CliError.reported')]: true,
			exitCode: 1,
			help: []
		})
		expect(isReportedCliError(foreign as any)).toBe(true)
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
