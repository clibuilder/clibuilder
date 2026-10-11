import { styleText } from 'node:util'
import { command } from '../index.js'
import { createStreamUI, routing } from './stream_ui.js'
import type { Sinks } from './streams.js'

function memorySinks(colour = false) {
	const out = { stdout: '', stderr: '' }
	const sinks: Sinks = {
		stdout: { colour, write: (text) => void (out.stdout += text) },
		stderr: { colour, write: (text) => void (out.stderr += text) }
	}
	return { sinks, out }
}

function sayAll(ui: ReturnType<typeof createStreamUI>) {
	ui.debug('debug')
	ui.info('info')
	ui.warn('warn')
	ui.error('error')
}

describe('console output', () => {
	it('writes info and debug to stdout, warn and error to stderr', () => {
		const { sinks, out } = memorySinks()
		const ui = createStreamUI(sinks, 'console')
		ui.displayLevel = 'debug'
		sayAll(ui)
		expect(out).toEqual({ stdout: 'debug\ninfo\n', stderr: 'warn\nerror\n' })
	})

	it('writes help and version to stdout', () => {
		const { sinks, out } = memorySinks()
		const ui = createStreamUI(sinks, 'console')
		ui.showVersion('1.2.3')
		ui.showVersion()
		ui.showHelp('app', command({ name: 'cmd', description: 'does things', run() {} }) as any)
		expect(out.stdout).toMatch(/^1\.2\.3\nnot versioned\n\nUsage: app cmd/)
		expect(out.stderr).toBe('')
	})
})

describe('axi output', () => {
	it('writes every ui message to stderr', () => {
		const { sinks, out } = memorySinks()
		const ui = createStreamUI(sinks, 'axi')
		ui.displayLevel = 'debug'
		sayAll(ui)
		expect(out).toEqual({ stdout: '', stderr: 'debug\ninfo\nwarn\nerror\n' })
	})

	it('writes help and version to stdout, because they are answers', () => {
		const { sinks, out } = memorySinks()
		const ui = createStreamUI(sinks, 'axi')
		ui.showVersion('1.2.3')
		ui.showHelp('app', command({ name: 'cmd', run() {} }) as any)
		expect(out.stdout).toMatch(/^1\.2\.3\n\nUsage: app cmd/)
		expect(out.stderr).toBe('')
	})
})

it('routes each preset as the RFC table says', () => {
	expect(routing).toEqual({
		console: { debug: 'stdout', info: 'stdout', warn: 'stderr', error: 'stderr', answer: 'stdout' },
		axi: { debug: 'stderr', info: 'stderr', warn: 'stderr', error: 'stderr', answer: 'stdout' }
	})
})

describe('display level', () => {
	it('starts at info, hiding debug', () => {
		const { sinks, out } = memorySinks()
		const ui = createStreamUI(sinks, 'console')
		expect(ui.displayLevel).toBe('info')
		sayAll(ui)
		expect(out).toEqual({ stdout: 'info\n', stderr: 'warn\nerror\n' })
	})

	it('says nothing at none', () => {
		const { sinks, out } = memorySinks()
		const ui = createStreamUI(sinks, 'console')
		ui.displayLevel = 'none'
		sayAll(ui)
		ui.showVersion('1.0.0')
		expect(out).toEqual({ stdout: '', stderr: '' })
	})

	it('shows debug at trace', () => {
		const { sinks, out } = memorySinks()
		const ui = createStreamUI(sinks, 'console')
		ui.displayLevel = 'trace'
		sayAll(ui)
		expect(out.stdout).toBe('debug\ninfo\n')
		expect(ui.displayLevel).toBe('trace')
	})

	it('can be lowered back to info', () => {
		const { sinks, out } = memorySinks()
		const ui = createStreamUI(sinks, 'console')
		ui.displayLevel = 'debug'
		ui.displayLevel = 'info'
		ui.debug('debug')
		expect(out.stdout).toBe('')
	})
})

describe('line format', () => {
	it('joins the arguments with spaces and inspects objects', () => {
		const { sinks, out } = memorySinks()
		createStreamUI(sinks, 'console').info('a', 1, { b: 2 }, [3], null)
		expect(out.stdout).toBe('a 1 { b: 2 } [ 3 ] \n')
	})

	it('does not read printf-style placeholders', () => {
		const { sinks, out } = memorySinks()
		createStreamUI(sinks, 'console').info('%s and %d', 'x', 1)
		expect(out.stdout).toBe('%s and %d x 1\n')
	})
})

describe('colour', () => {
	it('is plain when the stream does not allow colour', () => {
		const { sinks, out } = memorySinks(false)
		const ui = createStreamUI(sinks, 'console')
		sayAll(ui)
		expect(out.stderr).toBe('warn\nerror\n')
	})

	it('shows error in red and warn in yellow when the stream allows colour', () => {
		const { sinks, out } = memorySinks(true)
		const ui = createStreamUI(sinks, 'console')
		sayAll(ui)
		expect(out.stdout).toBe('info\n')
		expect(out.stderr).toBe(
			`${styleText('yellow', 'warn', { validateStream: false })}\n${styleText('red', 'error', { validateStream: false })}\n`
		)
	})
})
