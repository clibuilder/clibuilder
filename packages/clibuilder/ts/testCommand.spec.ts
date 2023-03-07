import { command, testCommand } from './index.js'

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
