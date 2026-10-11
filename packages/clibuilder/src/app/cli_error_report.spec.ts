import { Writable } from 'node:stream'
import { CliError, cli, exitCodes } from '../index.js'

function memoryStream() {
	const stream = new Writable({
		decodeStrings: false,
		write(chunk, _encoding, callback) {
			stream.text += chunk
			callback()
		}
	}) as Writable & { text: string }
	stream.text = ''
	return stream
}

function run(error: () => CliError, options: Partial<cli.Options> = {}, args: string[] = []) {
	const stdout = memoryStream()
	const stderr = memoryStream()
	const app = cli({ name: 'app', version: '1.0.0', streams: { stdout, stderr }, ...options }).default({
		run() {
			throw error()
		}
	})
	return app.parse(['node', 'app', ...args]).then((code) => ({ code, stdout: stdout.text, stderr: stderr.text }))
}

const notFound = () =>
	new CliError({
		message: 'no plugin named foo',
		code: 'not-found',
		details: { name: 'foo', candidates: ['foo-a', 'foo-b'] },
		help: ['run `app plugins list` to see them', 'run `app plugins add <name>`'],
		exitCode: 4
	})

afterEach(() => {
	process.exitCode = undefined
})

describe('axi output', () => {
	it('renders the report once on stdout in toon by default, and nothing on stderr', async () => {
		const r = await run(notFound, { output: 'axi' })
		expect(r.code).toBe(4)
		expect(process.exitCode).toBe(4)
		expect(r.stdout).toBe(
			[
				'error: no plugin named foo',
				'code: not-found',
				'name: foo',
				'candidates[2]: foo-a,foo-b',
				'help[2]: run `app plugins list` to see them,run `app plugins add <name>`',
				''
			].join('\n')
		)
		expect(r.stderr).toBe('')
	})

	it('renders in json when the cli format is json', async () => {
		const r = await run(notFound, { output: 'axi', format: 'json' })
		expect(r.stdout).toBe(
			'{"error":"no plugin named foo","code":"not-found","name":"foo","candidates":["foo-a","foo-b"],' +
				'"help":["run `app plugins list` to see them","run `app plugins add <name>`"]}\n'
		)
		expect(r.stderr).toBe('')
	})

	it('renders in text when the cli format is text', async () => {
		const r = await run(notFound, { output: 'axi', format: 'text' })
		expect(r.stdout).toBe(
			[
				'error: no plugin named foo',
				'code: not-found',
				'name: foo',
				'',
				'candidates:',
				'  - foo-a',
				'  - foo-b',
				'',
				'help:',
				'  - run `app plugins list` to see them',
				'  - run `app plugins add <name>`',
				''
			].join('\n')
		)
		expect(r.stderr).toBe('')
	})

	it('renders a plain CliError with the default code, and leaves out an empty help', async () => {
		const r = await run(() => new CliError('boom'), { output: 'axi' })
		expect(r.code).toBe(exitCodes.error)
		expect(r.stdout).toBe('error: boom\ncode: error\n')
		expect(r.stderr).toBe('')
	})

	it('quotes a value that toon must quote, through the official encoder', async () => {
		const r = await run(() => new CliError('a, b', { code: 'bad-list', help: 'x' }), { output: 'axi' })
		expect(r.stdout).toBe('error: "a, b"\ncode: bad-list\nhelp[1]: x\n')
	})

	it('writes a debugging copy as a debug line on stderr under --verbose', async () => {
		const r = await run(notFound, { output: 'axi' }, ['--verbose'])
		expect(r.stdout).toBe(
			[
				'error: no plugin named foo',
				'code: not-found',
				'name: foo',
				'candidates[2]: foo-a,foo-b',
				'help[2]: run `app plugins list` to see them,run `app plugins add <name>`',
				''
			].join('\n')
		)
		expect(r.stderr).toContain('CliError: no plugin named foo')
		expect(r.stderr).toContain("code: 'not-found'")
		expect(r.stderr).toContain('exitCode: 4')
	})

	it('exits with an exit code of 255', async () => {
		const r = await run(() => new CliError('boom', { exitCode: 255 }), { output: 'axi' })
		expect(r.code).toBe(255)
		expect(process.exitCode).toBe(255)
	})

	it('renders a CliError subclass', async () => {
		class NotFoundError extends CliError {
			constructor(name: string) {
				super(`no plugin named ${name}`, { code: 'not-found', details: { name } })
			}
		}
		const r = await run(() => new NotFoundError('foo'), { output: 'axi' })
		expect(r.stdout).toBe('error: no plugin named foo\ncode: not-found\nname: foo\n')
	})

	it('renders a CliError from an older copy of clibuilder, which has no code or details', async () => {
		const foreign = () =>
			Object.assign(new Error('boom'), { [Symbol.for('clibuilder.CliError')]: true, exitCode: 3, help: ['try'] })
		const r = await run(foreign as any, { output: 'axi' })
		expect(r.code).toBe(3)
		expect(r.stdout).toBe('error: boom\ncode: error\nhelp[1]: try\n')
	})

	it('renders nothing for CliError.reported() and exits with its code', async () => {
		const r = await run(() => CliError.reported(5), { output: 'axi' }, ['--verbose'])
		expect(r.code).toBe(5)
		expect(r.stdout).toBe('')
		expect(r.stderr).not.toContain('CliError')
	})
})

describe('console output', () => {
	it('writes the message and help lines to stderr, as before', async () => {
		const r = await run(notFound)
		expect(r.code).toBe(4)
		expect(r.stdout).toBe('')
		expect(r.stderr).toBe('no plugin named foo\nrun `app plugins list` to see them\nrun `app plugins add <name>`\n')
	})

	it('does not encode the report, even with a format', async () => {
		const r = await run(notFound, { output: 'console', format: 'json' })
		expect(r.stdout).toBe('')
		expect(r.stderr).toBe('no plugin named foo\nrun `app plugins list` to see them\nrun `app plugins add <name>`\n')
	})

	it('renders nothing for CliError.reported() and exits with its code', async () => {
		const r = await run(() => CliError.reported(3))
		expect(r.code).toBe(3)
		expect(r.stdout + r.stderr).toBe('')
	})
})

describe('cli({ format })', () => {
	it('rejects a format that is not toon, json or text', () => {
		expect(() => cli({ name: 'app', version: '1.0.0', format: 'yaml' as any })).toThrow(
			'cli({ format }) must be one of toon, json, text, received yaml'
		)
	})
})
