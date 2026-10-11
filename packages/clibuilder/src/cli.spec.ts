import { Writable } from 'node:stream'
import a from 'assertron'
import { testType } from 'type-plus/testing'
import { z } from 'zod'
import { cli, t } from './index.js'

it('needs name and version', () => {
	const app = cli({ name: 'app', version: '1.0.0' })
	a.satisfies(app, { name: 'app', version: '1.0.0' })
})

it('can have a short description', () => {
	const app = cli({ name: 'app', version: '1.0.0', description: 'some short description' })
	a.satisfies(app, { name: 'app', version: '1.0.0', description: 'some short description' })
})

it('can set config to true which will try to read config', () => {
	const app = cli({ name: 'app', version: '1.0.0', config: true })
	a.satisfies(app, { name: 'app', version: '1.0.0' })
})

it('can specify a different name for config', () => {
	const app = cli({ name: 'app', version: '1.0.0', config: 'another-name' })
	a.satisfies(app, { name: 'app', version: '1.0.0' })
})

it('can specify a specific config file', () => {
	const app = cli({ name: 'app', version: '1.0.0', config: 'my-app.json' })
	a.satisfies(app, { name: 'app', version: '1.0.0' })
})

it('has no keywords option: plugin keywords are an option of plugins() from @clibuilder/plugins since v12', () => {
	// @ts-expect-error `keywords` is not a cli option
	cli({ name: 'app', version: '1.0.0', keywords: ['my-app'] })
})

it('can specify type of the arguments and options. The command will receive the typed `args`', () => {
	cli({ name: 'app', version: '1.0.0' }).default({
		arguments: [
			{ name: 'a', description: 'what does it do?', type: t.string() },
			{ name: 'b', description: 'what does it do?', type: t.boolean() },
			{ name: 'c', description: 'what does it do?', type: t.array(t.number()) }
		],
		options: {
			ob: { type: t.boolean(), description: 'a' },
			obm: { type: t.array(t.boolean()), description: 'a' },
			on: { type: t.number(), description: 'a' },
			onm: { type: t.array(t.number()), description: 'a' },
			os: { type: t.string(), description: 'a' },
			osm: { type: t.array(t.string()), description: 'a' },
			oob: { type: t.boolean().optional(), description: 'a' },
			oobm: { type: t.array(t.boolean()).optional(), description: 'a' },
			oon: { type: t.number().optional(), description: 'a' },
			oonm: { type: t.array(t.number()).optional(), description: 'a' },
			oos: { type: t.string().optional(), description: 'a' },
			oosm: { type: t.array(t.string()).optional(), description: 'a' }
		},
		run(args) {
			args satisfies {
				a: string
				b: boolean
				c: number[]
				ob: boolean
				obm: boolean[]
				on: number
				onm: number[]
				os: string
				osm: string[]
				oob: boolean | undefined
				oobm: boolean[] | undefined
				oon: number | undefined
				oonm: number[] | undefined
				oos: string | undefined
				oosm: string[] | undefined
				help: boolean | undefined
			}
		}
	})
})

it(`can also leave arguments and options not typed,
which will default to string and boolean respectively`, () => {
	cli({ name: 'app', version: '1.0.0' }).default({
		arguments: [{ name: 'a', description: 'some a' }],
		options: { b: { description: 'some b' } },
		run(args) {
			testType.equal<string, typeof args.a>(true)
			testType.equal<boolean | undefined, typeof args.b>(true)
		}
	})
})

it('will have parse method if default command is defined', () => {
	const app = cli({ name: 'app', version: '1.0.0' }).default({ run() {} })
	testType.canAssign<typeof app, { parse(args: string[]): Promise<any> }>(true)
})

it('will have parse method if a command is defined', () => {
	const app = cli({ name: 'app', version: '1.0.0' }).command({
		name: 'cmd',
		run() {}
	})
	testType.canAssign<typeof app, { parse(args: string[]): Promise<any> }>(true)
})

it('will have parse method if config is defined', () => {
	const app = cli({ name: 'app', version: '1.0.0', config: true })
	testType.canAssign<typeof app, { parse(args: string[]): Promise<any> }>(true)
	expect(app.parse).toBeDefined()
})

it('can specify the config used by the command', () => {
	cli({ name: 'app', version: '1.0.0' }).default({
		config: z.object({
			c: z.boolean()
		}),
		run() {
			testType.equal<boolean, typeof this.config.c>(true)
		}
	})
})

describe('streams and output', () => {
	function memoryStream(isTTY?: boolean) {
		const stream = new Writable({
			decodeStrings: false,
			write(chunk, _encoding, callback) {
				stream.text += chunk
				callback()
			}
		}) as Writable & { text: string; isTTY?: boolean }
		stream.text = ''
		if (isTTY) stream.isTTY = true
		return stream
	}

	const app = (options: Partial<cli.Options>) =>
		cli({ name: 'app', version: '1.0.0', ...options }).default({
			run() {
				this.ui.info('info')
				this.ui.warn('warn')
				this.ui.error('error')
				return 'result'
			}
		})

	it('writes the ui to the given streams in console mode', async () => {
		const stdout = memoryStream()
		const stderr = memoryStream()
		const result = await app({ output: 'console', streams: { stdout, stderr } }).parse(['node', 'app'])
		expect(result).toBe('result')
		expect(stdout.text).toBe('info\n')
		expect(stderr.text).toBe('warn\nerror\n')
	})

	it.each([
		{ output: 'axi' },
		{}
	] as const)('writes every ui message to stderr in axi mode, the default: %j', async (options) => {
		const stdout = memoryStream()
		const stderr = memoryStream()
		const result = await app({ ...options, streams: { stdout, stderr } }).parse(['node', 'app'])
		expect(result).toBe('result')
		// only the answer, the returned value, is on stdout
		expect(stdout.text).toBe('result\n')
		expect(stderr.text).toBe('info\nwarn\nerror\n')
	})

	it('writes the framework messages and help through the same streams in console mode', async () => {
		const stdout = memoryStream()
		const stderr = memoryStream()
		const code = await app({ output: 'console', streams: { stdout, stderr } }).parse(['node', 'app', '--bogus'])
		expect(code).toBe(2)
		expect(stderr.text).toBe('unknown option --bogus\n')
		expect(stdout.text).toMatch(/^\nUsage: app/)
		process.exitCode = undefined
	})

	it('follows --verbose and --silent', async () => {
		const verbose = { stdout: memoryStream(), stderr: memoryStream() }
		await app({ streams: verbose }).parse(['node', 'app', '--verbose'])
		expect(verbose.stderr.text).toContain('argv: node app --verbose')
		const silent = { stdout: memoryStream(), stderr: memoryStream() }
		await app({ streams: silent }).parse(['node', 'app', '--silent'])
		// `--silent` quiets the ui, not the answer
		expect(silent.stdout.text).toBe('result\n')
		expect(silent.stderr.text).toBe('')
	})

	it('writes --version and --help to the given stdout in both modes', async () => {
		for (const output of ['console', 'axi'] as const) {
			for (const argv of [['--version'], ['--help', '--version']]) {
				const stdout = memoryStream()
				const stderr = memoryStream()
				await app({ output, streams: { stdout, stderr } }).parse(['node', 'app', ...argv])
				expect(stdout.text).toMatch(/^1\.0\.0\n$|^\nUsage: app/)
				expect(stderr.text).toBe('')
			}
		}
	})

	it('writes a usage error as one coded error on stdout and nothing on stderr in axi mode, the default', async () => {
		const stdout = memoryStream()
		const stderr = memoryStream()
		await app({ streams: { stdout, stderr } }).parse(['node', 'app', '--bogus'])
		expect(stderr.text).toBe('')
		expect(stdout.text).toMatch(/^error: unknown option --bogus\ncode: unknown-option\n/)
		process.exitCode = undefined
	})

	describe('colour', () => {
		const env = { ...process.env }
		afterEach(() => {
			process.env = { ...env }
		})

		it('colours a TTY stream', async () => {
			delete process.env.NO_COLOR
			process.env.FORCE_COLOR = '1'
			const stderr = memoryStream(true)
			await app({ streams: { stdout: memoryStream(true), stderr } }).parse(['node', 'app'])
			expect(stderr.text).toContain('\u001b[31merror')
		})

		it('does not colour a TTY stream when NO_COLOR is set', async () => {
			delete process.env.FORCE_COLOR
			process.env.NO_COLOR = '1'
			const stderr = memoryStream(true)
			await app({ streams: { stdout: memoryStream(true), stderr } }).parse(['node', 'app'])
			expect(stderr.text).toBe('info\nwarn\nerror\n')
		})

		it('never colours a stream that is not a TTY, even with FORCE_COLOR', async () => {
			process.env.FORCE_COLOR = '3'
			const stderr = memoryStream()
			await app({ streams: { stdout: memoryStream(), stderr } }).parse(['node', 'app'])
			expect(stderr.text).toBe('info\nwarn\nerror\n')
		})
	})
})
