import { execFileSync, spawn } from 'node:child_process'
import { EventEmitter } from 'node:events'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { createSinks, handleEpipe, shouldColour } from './streams.js'

function fakeStream(props: { isTTY?: boolean; hasColors?: () => boolean } = {}) {
	const stream = Object.assign(new EventEmitter(), props, { write: vi.fn(() => true) })
	return stream as unknown as NodeJS.WritableStream & { write: ReturnType<typeof vi.fn> }
}

describe('shouldColour()', () => {
	it('never colours a stream that is not a TTY', () => {
		expect(shouldColour(fakeStream(), {})).toBe(false)
		expect(shouldColour(fakeStream(), { FORCE_COLOR: '1' })).toBe(false)
		expect(shouldColour(fakeStream({ isTTY: false }), { FORCE_COLOR: '3' })).toBe(false)
	})

	it('colours a TTY that has colours', () => {
		expect(shouldColour(fakeStream({ isTTY: true, hasColors: () => true }), {})).toBe(true)
	})

	it('does not colour a TTY without colours', () => {
		expect(shouldColour(fakeStream({ isTTY: true, hasColors: () => false }), {})).toBe(false)
	})

	it('colours a TTY that does not say whether it has colours', () => {
		expect(shouldColour(fakeStream({ isTTY: true }), {})).toBe(true)
	})

	it('does not colour a TTY when NO_COLOR is set', () => {
		expect(shouldColour(fakeStream({ isTTY: true, hasColors: () => true }), { NO_COLOR: '1' })).toBe(false)
	})

	it('ignores an empty NO_COLOR', () => {
		expect(shouldColour(fakeStream({ isTTY: true, hasColors: () => true }), { NO_COLOR: '' })).toBe(true)
	})

	it('colours a TTY when FORCE_COLOR is set, over NO_COLOR and the terminal', () => {
		expect(shouldColour(fakeStream({ isTTY: true, hasColors: () => false }), { FORCE_COLOR: '1' })).toBe(true)
		expect(shouldColour(fakeStream({ isTTY: true }), { FORCE_COLOR: '', NO_COLOR: '1' })).toBe(true)
	})

	it('does not colour a TTY when FORCE_COLOR is 0 or false', () => {
		expect(shouldColour(fakeStream({ isTTY: true, hasColors: () => true }), { FORCE_COLOR: '0' })).toBe(false)
		expect(shouldColour(fakeStream({ isTTY: true, hasColors: () => true }), { FORCE_COLOR: 'false' })).toBe(false)
	})
})

describe('createSinks()', () => {
	it('writes to the given streams as given', () => {
		const stdout = fakeStream()
		const stderr = fakeStream()
		const sinks = createSinks({ stdout, stderr }, {})
		sinks.stdout.write('out\n')
		sinks.stderr.write('err\n')
		expect(stdout.write).toHaveBeenCalledWith('out\n')
		expect(stderr.write).toHaveBeenCalledWith('err\n')
	})

	it('does not watch a stream passed in for EPIPE', () => {
		const stdout = fakeStream()
		createSinks({ stdout, stderr: fakeStream() }, {})
		expect(stdout.listenerCount('error')).toBe(0)
	})

	it('watches the process stdout once however many sinks are made', () => {
		const before = process.stdout.listenerCount('error')
		createSinks({ stdout: process.stdout, stderr: process.stderr })
		const after = process.stdout.listenerCount('error')
		createSinks({ stdout: process.stdout, stderr: process.stderr })
		expect(after).toBeLessThanOrEqual(before + 1)
		expect(process.stdout.listenerCount('error')).toBe(after)
	})
})

describe('handleEpipe()', () => {
	const original = process.exitCode
	afterEach(() => {
		process.exitCode = original
	})

	it('drops every write after EPIPE and sets the exit code to 0', () => {
		const stdout = fakeStream()
		handleEpipe(stdout)
		const sinks = createSinks({ stdout, stderr: fakeStream() }, {})
		sinks.stdout.write('before\n')
		process.exitCode = 1
		stdout.emit('error', Object.assign(new Error('write EPIPE'), { code: 'EPIPE' }))
		sinks.stdout.write('after\n')
		expect(stdout.write).toHaveBeenCalledTimes(1)
		expect(process.exitCode).toBe(0)
	})

	it('rethrows any other stream error', () => {
		const stdout = fakeStream()
		handleEpipe(stdout)
		const error = Object.assign(new Error('boom'), { code: 'EIO' })
		expect(() => stdout.emit('error', error)).toThrow(error)
	})

	it('installs one handler per stream', () => {
		const stdout = fakeStream()
		handleEpipe(stdout)
		handleEpipe(stdout)
		expect(stdout.listenerCount('error')).toBe(1)
	})
})

describe('EPIPE on the process stdout', () => {
	const esm = pathToFileURL(resolve(import.meta.dirname, '../../esm/index.js')).href

	/**
	 * Runs a cli that writes many lines to stdout, reads its first chunk, then closes the reader.
	 */
	function runPiped(cliOptions: string) {
		const dir = mkdtempSync(join(tmpdir(), 'clibuilder-epipe-'))
		const script = join(dir, 'bin.mjs')
		writeFileSync(
			script,
			`import { cli } from ${JSON.stringify(esm)}
const app = cli({ name: 'app', version: '1.0.0', ${cliOptions} }).default({
	async run() {
		for (let batch = 0; batch < 50; batch++) {
			for (let i = 0; i < 2000; i++) this.ui.info('line ' + batch + ':' + i)
			await new Promise((r) => setTimeout(r, 1))
		}
	}
})
await app.parse(process.argv)
`
		)
		return new Promise<{ code: number | null; stderr: string }>((done, fail) => {
			const child = spawn(process.execPath, [script], { stdio: ['ignore', 'pipe', 'pipe'] })
			let stderr = ''
			child.stderr.on('data', (d) => {
				stderr += d
			})
			child.stdout.once('data', () => child.stdout.destroy())
			child.on('error', fail)
			child.on('close', (code) => done({ code, stderr }))
		})
	}

	it('exits 0 quietly when the reader closes early, with the default ui', async () => {
		const { code, stderr } = await runPiped('')
		expect(stderr).toBe('')
		expect(code).toBe(0)
	}, 30_000)

	it('exits 0 quietly when the reader closes early, with the built-in ui', async () => {
		const { code, stderr } = await runPiped('streams: { stdout: process.stdout, stderr: process.stderr }')
		expect(stderr).toBe('')
		expect(code).toBe(0)
	}, 30_000)
})

describe('the ui engine a real process gets', () => {
	const esm = pathToFileURL(resolve(import.meta.dirname, '../../esm/index.js')).href

	function run(cliOptions: string) {
		const dir = mkdtempSync(join(tmpdir(), 'clibuilder-engine-'))
		const script = join(dir, 'bin.mjs')
		writeFileSync(
			script,
			`import { cli } from ${JSON.stringify(esm)}
await cli({ name: 'app', version: '1.0.0', ${cliOptions} })
	.default({ run() { this.ui.info('info'); this.ui.warn('warn'); this.ui.error('error') } })
	.parse([...process.argv, '--debug-cli'])
`
		)
		const env = { ...process.env }
		delete env.FORCE_COLOR
		delete env.NO_COLOR
		return execFileSync(process.execPath, [script], { env, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
	}

	it('is standard-log without streams or axi output, so the output is unchanged', () => {
		// standard-log-color prefixes the framework's own messages with its logger id
		expect(run('')).toMatch(/^clibuilder argv: /)
		expect(run(`output: 'console'`)).toMatch(/^clibuilder argv: /)
	})

	it('is the built-in ui when streams are given', () => {
		expect(run('streams: { stdout: process.stdout, stderr: process.stderr }')).toMatch(/^argv: .*\ninfo\n$/)
	})
})
