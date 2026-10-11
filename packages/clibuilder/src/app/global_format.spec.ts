import { Writable } from 'node:stream'
import { CliError, cli, command, exitCodes, t } from '../index.js'

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

function setup(options: Partial<cli.Options> = {}) {
	const stdout = memoryStream()
	const stderr = memoryStream()
	const app = cli({ name: 'app', version: '1.0.0', streams: { stdout, stderr }, ...options })
	return { app, stdout, stderr }
}

/**
 * Runs `args` against a cli with a `show` sub-command that records `this.format`.
 */
async function runShow(args: string, options: Partial<cli.Options> = {}) {
	const { app, stdout, stderr } = setup(options)
	let format: cli.Format | undefined
	const code = await app
		.command({
			name: 'show',
			run() {
				format = this.format
			}
		})
		.parse(['node', 'app', ...args.split(' ').filter(Boolean)])
	return { code, format, stdout: stdout.text, stderr: stderr.text, exitCode: process.exitCode }
}

function countOf(text: string, needle: string) {
	return text.split(needle).length - 1
}

afterEach(() => {
	process.exitCode = undefined
})

describe('the global --format in the default console output, with no cli({ format })', () => {
	it('is not declared, so the help is unchanged', async () => {
		const { app, stdout } = setup()
		await app.command({ name: 'show', run() {} }).parse(['node', 'app', '--help'])
		expect(stdout.text).not.toContain('--format')
	})

	it('is an unknown option, as before', async () => {
		const r = await runShow('show --format json')
		expect(r.code).toBe(exitCodes.usage)
		expect(r.stderr).toContain('unknown option --format')
		expect(r.format).toBeUndefined()
	})

	it('gives run() the default format as this.format', async () => {
		const r = await runShow('show')
		expect(r.format).toBe('toon')
	})

	it('lets a command declare its own format option', async () => {
		const { app } = setup()
		let value: string | undefined
		await app
			.command({
				name: 'show',
				options: { format: { type: t.string().optional(), description: 'local' } },
				run(args) {
					value = args.format
				}
			})
			.parse(['node', 'app', 'show', '--format', 'yaml'])
		expect(value).toBe('yaml')
	})
})

describe.each([
	['output axi', { output: 'axi' }, 'toon'],
	['cli({ format })', { format: 'json' }, 'json'],
	['output axi and cli({ format })', { output: 'axi', format: 'text' }, 'text']
] as const)('the global --format under %s', (_, options, defaultFormat) => {
	it('is shown once in the help, in the global options', async () => {
		const { app, stdout, stderr } = setup(options)
		// under output axi `--help` follows `--format`, and the text help is the one that shows `--format`
		await app.command({ name: 'show', run() {} }).parse(['node', 'app', '--help', '--format', 'text'])
		const help = stdout.text + stderr.text
		expect(countOf(help, '--format')).toBe(1)
		expect(help).toContain(`(default '${defaultFormat}')`)
		expect(help).not.toContain('-f|')
	})

	it('gives run() the default format when --format is not passed', async () => {
		const r = await runShow('show', options)
		expect(r.format).toBe(defaultFormat)
		expect(r.exitCode).toBeUndefined()
	})

	it.each(['toon', 'json', 'text'] as const)('gives run() --format %s as this.format', async (format) => {
		const r = await runShow(`show --format ${format}`, options)
		expect(r.format).toBe(format)
		expect(r.exitCode).toBeUndefined()
	})

	it('accepts --format in inline form', async () => {
		expect((await runShow('show --format=text', options)).format).toBe('text')
	})

	it('reports a bad value as a usage error in the default format, exit 2, code invalid-value', async () => {
		const onUsageError = vi.fn()
		const r = await runShow('show --format yaml', { ...options, onUsageError })
		expect(r.code).toBe(exitCodes.usage)
		expect(r.format).toBeUndefined()
		expect(onUsageError).toHaveBeenCalledTimes(1)
		const [errors, context] = onUsageError.mock.calls[0]!
		expect(context.format).toBe(defaultFormat)
		expect(context.exitCode).toBe(exitCodes.usage)
		expect(errors).toHaveLength(1)
		expect(errors[0]).toMatchObject({
			type: 'invalid-value',
			code: 'invalid-value',
			key: 'format',
			value: 'yaml',
			allowed: ['toon', 'json', 'text']
		})
	})

	it('reports a bad value on the root as it does under a sub-command', async () => {
		const onUsageError = vi.fn()
		const { app } = setup({ ...options, onUsageError })
		await app.command({ name: 'show', run() {} }).parse(['node', 'app', '--format', 'yaml'])
		const [errors, context] = onUsageError.mock.calls[0]!
		expect(context.format).toBe(defaultFormat)
		expect(errors.map((e: cli.UsageError) => [e.code, (e as any).allowed])).toEqual([
			['invalid-value', ['toon', 'json', 'text']]
		])
	})

	it('prints a bad value through the usual usage-error report when no handler is declared', async () => {
		const r = await runShow('show --format yaml', options)
		expect(r.code).toBe(exitCodes.usage)
		if ('output' in options && options.output === 'axi') {
			// one coded error on stdout in the default format, nothing on stderr (axi-native RFC section 3.3)
			expect(r.stderr).toBe('')
			expect(countOf(r.stdout, 'code: invalid-value')).toBe(1)
			expect(countOf(r.stdout, 'allowed for --format: toon, json, text')).toBe(1)
			return
		}
		const out = r.stdout + r.stderr
		expect(
			countOf(out, `invalid value for option --format: expected one of 'toon', 'json', 'text', received "yaml"`)
		).toBe(1)
	})

	it('fails a command that declares its own format option at startup', () => {
		const { app } = setup(options)
		expect(() =>
			app.command({
				name: 'show',
				options: { format: { type: t.string().optional(), description: 'local' } },
				run() {}
			})
		).toThrow(/command 'show' declares its own option 'format'.*read this\.format.*axi-native\.md section 3\.4/)
	})

	it('fails a sub-command or a default command that declares its own format option', () => {
		const local = { format: { description: 'local' } }
		expect(() =>
			setup(options).app.command({
				name: 'group',
				commands: [command({ name: 'show', options: local, run() {} })]
			})
		).toThrow(/command 'show'/)
		expect(() => setup(options).app.default({ options: local, run() {} })).toThrow(/the default command/)
	})

	it('fails a command added by an extension that declares its own format option', async () => {
		const { app } = setup(options)
		const parse = app
			.use((context) => {
				context.addCommand({ name: 'show', options: { format: { description: 'local' } }, run() {} })
			})
			.parse(['node', 'app', 'show'])
		await expect(parse).rejects.toThrow(/command 'show' declares its own option 'format'/)
	})
})

describe('a CliError under output axi', () => {
	it('is rendered in the --format of the invocation', async () => {
		const { app, stdout, stderr } = setup({ output: 'axi' })
		const code = await app
			.default({
				run() {
					throw new CliError({ message: 'no plugin named foo', code: 'not-found' })
				}
			})
			.parse(['node', 'app', '--format', 'json'])
		expect(code).toBe(exitCodes.error)
		expect(stdout.text).toBe('{"error":"no plugin named foo","code":"not-found"}\n')
		expect(stderr.text).toBe('')
	})
})
