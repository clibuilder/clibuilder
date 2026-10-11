import { execFileSync, spawnSync } from 'node:child_process'
import { EventEmitter } from 'node:events'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
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
	 * Runs a cli that writes many lines to stdout piped into `head -c 1`, which exits after one byte.
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
		// a shell pipe into `head`, the case the handler is for: a real OS pipe whose reader exits early.
		// A pipe from `spawn` is a socket pair on macOS, where the closed reader reports ENOTCONN instead.
		const q = (path: string) => `'${path.replace(/'/g, `'\\''`)}'`
		const errFile = join(dir, 'stderr.txt')
		const codeFile = join(dir, 'code.txt')
		execFileSync('sh', [
			'-c',
			`(${q(process.execPath)} ${q(script)} 2>${q(errFile)}; echo $? >${q(codeFile)}) | head -c 1 >/dev/null`
		])
		return { code: Number(readFileSync(codeFile, 'utf8').trim()), stderr: readFileSync(errFile, 'utf8') }
	}

	it.skipIf(process.platform === 'win32')(
		'exits 0 quietly when the reader closes early, with the default ui',
		() => {
			// console output, so `ui.info` writes to the piped stdout
			const { code, stderr } = runPiped(`output: 'console'`)
			expect(stderr).toBe('')
			expect(code).toBe(0)
		},
		30_000
	)

	it.skipIf(process.platform === 'win32')(
		'exits 0 quietly when the reader closes early, with the built-in ui',
		() => {
			const { code, stderr } = runPiped(
				`output: 'console', streams: { stdout: process.stdout, stderr: process.stderr }`
			)
			expect(stderr).toBe('')
			expect(code).toBe(0)
		},
		30_000
	)
})

describe('the ui engine a real process gets', () => {
	const esm = pathToFileURL(resolve(import.meta.dirname, '../../esm/index.js')).href

	function run(cliOptions: string, extraEnv: Record<string, string> = {}) {
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
		const { stdout, stderr } = spawnSync(process.execPath, [script], {
			env: { ...env, ...extraEnv },
			encoding: 'utf8',
			stdio: ['ignore', 'pipe', 'pipe']
		})
		return { stdout, stderr }
	}

	// v11 wrote through standard-log here, prefixing the framework's own messages with `clibuilder`
	it('is the built-in ui in every mode', () => {
		expect(run('').stderr).toMatch(/^argv: .*\ninfo\nwarn\nerror\n$/)
		expect(run(`output: 'console'`).stdout).toMatch(/^argv: .*\ninfo\n$/)
		expect(run(`output: 'console', streams: { stdout: process.stdout, stderr: process.stderr }`).stdout).toMatch(
			/^argv: .*\ninfo\n$/
		)
	})

	it('routes every ui message to stderr in the default axi mode', () => {
		expect(run('').stdout).toBe('')
	})

	it('routes warn and error to stderr in console mode', () => {
		expect(run(`output: 'console'`).stderr).toBe('warn\nerror\n')
	})

	// v11's standard-log-color wrapped the framework's error and warn text in colour on any stream
	it('does not colour a stream that is not a TTY, even with FORCE_COLOR', () => {
		expect(run(`output: 'console'`, { FORCE_COLOR: '1' }).stderr).toBe('warn\nerror\n')
		expect(run('', { FORCE_COLOR: '1' }).stderr).toMatch(/\nwarn\nerror\n$/)
	})
})
