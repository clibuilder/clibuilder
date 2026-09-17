import { context } from './context.js'

describe('exit()', () => {
	// the code is recorded on `process` rather than acted on immediately,
	// so it is restored here to leave this test run's own exit code alone.
	const original = process.exitCode
	afterEach(() => {
		process.exitCode = original
	})

	it('records the code the process should exit with', () => {
		context().exit(2)
		expect(process.exitCode).toBe(2)
	})

	it('does not end the process', () => {
		context().exit(1)
		expect(true).toBe(true)
	})
})
