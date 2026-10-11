import { Writable } from 'node:stream'
import { mockContext } from './context.mock.js'

describe('mockContext()', () => {
	it('captures the ui at info', () => {
		const ctx = mockContext()
		ctx.ui.dump()
		ctx.ui.debug('debug')
		ctx.ui.info('info')
		expect(ctx.messages).toBe('info')
	})

	it('captures a command ui with the framework messages, in order', () => {
		const ctx = mockContext()
		ctx.ui.dump()
		ctx.ui.info('framework')
		ctx.createCommandUI('cmd').warn('command')
		ctx.ui.error('framework again')
		expect(ctx.messages).toBe('framework\ncommand\nframework again')
	})

	it('writes the ui to the given streams instead', () => {
		let text = ''
		const stream = new Writable({
			decodeStrings: false,
			write(chunk, _encoding, callback) {
				text += chunk
				callback()
			}
		})
		const ctx = mockContext({ streams: { stdout: stream, stderr: stream } })
		ctx.createCommandUI('cmd').info('hello')
		ctx.writeStdout('1.0.0\n')
		expect(text).toBe('hello\n1.0.0\n')
		expect(ctx.messages).toBe('')
		expect(ctx.stdout).toBe('')
	})
})
