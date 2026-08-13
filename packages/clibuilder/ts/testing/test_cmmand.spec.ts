import { CliError, command, exitCodes, testCommand } from '../index.js'

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
