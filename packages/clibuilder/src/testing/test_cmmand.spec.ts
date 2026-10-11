import { CliError, command, exitCodes } from '../index.js'
import { testCommand } from './index.js'

test('get result', async () => {
	const { result } = await testCommand(
		command({
			name: 'cmd',
			run() {
				return 'a'
			}
		}),
		'cmd'
	)
	expect(result).toBe('a')
})

test('get messages', async () => {
	const { messages } = await testCommand(
		command({
			name: 'cmd',
			run() {
				this.ui.info('hello')
			}
		}),
		'cmd'
	)
	expect(messages).toBe('hello')
})

test('get no exit code when the command succeeds', async () => {
	const { exitCode } = await testCommand(
		command({
			name: 'cmd',
			run() {}
		}),
		'cmd'
	)
	expect(exitCode).toBeUndefined()
})

test('get the exit code of a failing command', async () => {
	const { exitCode, messages } = await testCommand(
		command({
			name: 'cmd',
			run() {
				throw new CliError('nope', { exitCode: exitCodes.usage, help: 'try `cmd --help`' })
			}
		}),
		'cmd'
	)
	expect(exitCode).toBe(2)
	expect(messages).toContain('nope')
	expect(messages).toContain('try `cmd --help`')
})

test('get the exit code of a usage error', async () => {
	const { exitCode, messages } = await testCommand(
		command({
			name: 'cmd',
			run() {
				throw new Error('should not reach')
			}
		}),
		'cmd --bogus'
	)
	expect(exitCode).toBe(2)
	expect(messages).toContain('unknown option --bogus')
})

test('get the version in messages when asked for it alone', async () => {
	const { messages, result, exitCode } = await testCommand(command({ name: 'cmd', run() {} }), '-v')
	expect(messages).toBe('1.0.0')
	expect(result).toBeUndefined()
	expect(exitCode).toBeUndefined()
})

test('get messages from stdout and stderr in the order they were said, one per line', async () => {
	const { messages } = await testCommand(
		command({
			name: 'cmd',
			run() {
				this.ui.info('one')
				this.ui.error('two')
				this.ui.warn('three', { four: 4 })
				this.ui.info('five')
			}
		}),
		'cmd'
	)
	expect(messages).toBe('one\ntwo\nthree { four: 4 }\nfive')
})

test('get debug messages with --verbose', async () => {
	const { messages } = await testCommand(
		command({
			name: 'cmd',
			run() {
				this.ui.debug('details')
			}
		}),
		'cmd --verbose'
	)
	expect(messages).toContain('details')
})

test('write nothing to the process streams', async () => {
	const stdout = vi.spyOn(process.stdout, 'write')
	const stderr = vi.spyOn(process.stderr, 'write')
	try {
		await testCommand(
			command({
				name: 'cmd',
				run() {
					this.ui.info('info')
					this.ui.error('error')
				}
			}),
			'cmd'
		)
		expect(stdout).not.toHaveBeenCalled()
		expect(stderr).not.toHaveBeenCalled()
	} finally {
		stdout.mockRestore()
		stderr.mockRestore()
	}
})

describe('output', () => {
	const cmd = command({
		name: 'cmd',
		run() {
			this.ui.info('hello')
			return { count: 1 }
		}
	})

	test('is axi by default: the returned value is printed after what the command said', async () => {
		const { result, messages } = await testCommand(cmd, 'cmd')
		expect(result).toEqual({ count: 1 })
		expect(messages).toBe('hello\ncount: 1')
	})

	test('is console when asked: the returned value is not printed', async () => {
		const { result, messages } = await testCommand(cmd, 'cmd', undefined, { output: 'console' })
		expect(result).toEqual({ count: 1 })
		expect(messages).toBe('hello')
	})

	test('reports a CliError as an encoded report by default, and as its message in console', async () => {
		const failing = command({
			name: 'cmd',
			run() {
				throw new CliError('nope', { code: 'not-found', help: 'try again' })
			}
		})
		expect((await testCommand(failing, 'cmd')).messages).toBe(
			'error: nope\ncode: not-found\nhelp[1]: try again\nexit with 1'
		)
		expect((await testCommand(failing, 'cmd', undefined, { output: 'console' })).messages).toBe(
			'nope\ntry again\nexit with 1'
		)
	})
})
