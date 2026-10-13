import { CliError, exitCodes, result, runScript } from '../axi.js'
import { cli, t } from '../index.js'

function streams() {
	const out: string[] = []
	const err: string[] = []
	return {
		out,
		err,
		streams: { stdout: { write: (s: string) => out.push(s) }, stderr: { write: (s: string) => err.push(s) } }
	}
}

describe('runScript', () => {
	it('prints what run() returns in toon by default and resolves to 0', async () => {
		const s = streams()
		const code = await runScript(
			{
				options: { name: { description: 'who', type: t.string() } },
				run: ({ name }) => result({ greeting: `hello ${name}` })
			},
			{ argv: ['--name', 'bob'], streams: s.streams }
		)
		expect(code).toBe(0)
		expect(s.out.join('')).toBe('greeting: hello bob\n')
		expect(s.err).toEqual([])
	})

	it('reads --format into this.format and encodes in it', async () => {
		const s = streams()
		await runScript(
			{
				run() {
					return { format: this.format, n: 1 }
				}
			},
			{ argv: ['--format', 'json'], streams: s.streams }
		)
		expect(s.out.join('')).toBe('{"format":"json","n":1}\n')
	})

	it('defaults argv to the process arguments', async () => {
		const s = streams()
		const argv = process.argv
		process.argv = ['node', 'script', '--format=json']
		try {
			await runScript({ run: () => ({ a: 1 }) }, { streams: s.streams })
		} finally {
			process.argv = argv
		}
		expect(s.out.join('')).toBe('{"a":1}\n')
	})

	it('prints nothing for undefined', async () => {
		const s = streams()
		expect(await runScript({ run() {} }, { argv: [], streams: s.streams })).toBe(0)
		expect(s.out).toEqual([])
	})

	it('writes ui to stderr, never stdout', async () => {
		const s = streams()
		await runScript(
			{
				run() {
					this.ui.info('hello', { a: 1 })
					this.ui.debug('hidden')
					this.ui.displayLevel = 'debug'
					this.ui.debug('shown')
					this.ui.warn('w')
					this.ui.error(new Error('e').message)
					this.ui.displayLevel = 'none'
					this.ui.info('silent')
					expect(this.ui.displayLevel).toBe('none')
				}
			},
			{ argv: [], streams: s.streams }
		)
		expect(s.out).toEqual([])
		expect(s.err).toEqual(['hello {"a":1}\n', 'shown\n', 'w\n', 'e\n'])
	})

	it('applies option defaults, aliases and flags', async () => {
		const s = streams()
		await runScript(
			{
				options: {
					n: { description: 'count', type: t.number(), default: 3, alias: ['c', { alias: 'k', hidden: true }] },
					all: { description: 'all' }
				},
				run: (args) => ({ n: args.n, all: args.all })
			},
			{ argv: ['-k', '5', '--all'], streams: s.streams }
		)
		expect(s.out.join('')).toBe('n: 5\nall: true\n')
	})

	it('reports a CliError with errorOutput and its exit code', async () => {
		const s = streams()
		const code = await runScript(
			{
				run() {
					throw new CliError('nope', { code: 'not-found', details: { path: 'a' }, help: 'try b', exitCode: 3 })
				}
			},
			{ argv: ['--format', 'json'], streams: s.streams }
		)
		expect(code).toBe(3)
		expect(JSON.parse(s.out.join(''))).toEqual({ error: 'nope', code: 'not-found', path: 'a', help: ['try b'] })
	})

	it('prints nothing for a CliError.reported()', async () => {
		const s = streams()
		const code = await runScript(
			{
				run() {
					throw CliError.reported(4)
				}
			},
			{ argv: [], streams: s.streams }
		)
		expect(code).toBe(4)
		expect(s.out).toEqual([])
	})

	it('reports the top-ranked usage error with its code and exits 2', async () => {
		const s = streams()
		const code = await runScript(
			{ options: { n: { description: 'count', type: t.number() } }, run: () => ({}) },
			{ argv: ['--n', 'abc'], streams: s.streams }
		)
		expect(code).toBe(exitCodes.usage)
		expect(s.out.join('')).toBe(
			'error: "invalid value for option -n: expected a number, received \\"abc\\""\n' +
				'code: invalid-value\n' +
				'option: "-n"\n' +
				'value: abc\n' +
				'help[2]: "Usage: script <options>","expected for -n: number (received \\"abc\\")"\n'
		)
	})

	it('reports an unknown option and an extra positional with their codes', async () => {
		for (const [argv, code] of [
			[['--nope'], 'unknown-option'],
			[['file'], 'extra-arguments']
		] as const) {
			const s = streams()
			expect(await runScript({ run: () => ({}) }, { argv: [...argv], streams: s.streams })).toBe(2)
			expect(s.out.join('')).toContain(`code: ${code}`)
			expect(s.out.join('')).not.toContain('--help')
		}
	})

	it('passes positional arguments to run()', async () => {
		const s = streams()
		await runScript(
			{
				arguments: [
					{ name: 'src', description: 'from' },
					{ name: 'n', description: 'count', type: t.number().optional() }
				],
				run: (args) => ({ src: args.src, n: args.n })
			},
			{ argv: ['a.txt', '2', '--format', 'json'], streams: s.streams }
		)
		expect(s.out.join('')).toBe('{"src":"a.txt","n":2}\n')
	})

	it('reports conflicting options, and a default does not count as passed', async () => {
		const command = {
			options: {
				all: { description: 'all', conflicts: ['only'] },
				only: { description: 'only', type: t.string().optional() },
				n: { description: 'n', type: t.number(), default: 1, conflicts: ['all'] }
			},
			run: () => ({ ok: true })
		}
		const s = streams()
		expect(await runScript(command, { argv: ['--all', '--only', 'x'], streams: s.streams })).toBe(2)
		expect(s.out.join('')).toContain('code: conflicting-options')
		expect(await runScript(command, { argv: ['--all'], streams: streams().streams })).toBe(0)
	})

	it('takes arguments and conflicts declared inline', async () => {
		const s = streams()
		const code = await runScript(
			{
				arguments: [{ name: 'src', description: 'from' }],
				options: { all: { description: 'all', conflicts: ['none'] }, none: { description: 'none' } },
				run: ({ src, all }) => ({ src, all })
			},
			{ argv: ['a', '--all', '--format', 'json'], streams: s.streams }
		)
		expect(code).toBe(0)
		expect(s.out.join('')).toBe('{"src":"a","all":true}\n')
	})

	it('rejects a bad --format as a usage error', async () => {
		const s = streams()
		expect(await runScript({ run: () => ({}) }, { argv: ['--format', 'xml'], streams: s.streams })).toBe(2)
	})

	it('rejects any other error', async () => {
		await expect(
			runScript(
				{
					run() {
						throw new Error('boom')
					}
				},
				{ argv: [], streams: streams().streams }
			)
		).rejects.toThrow('boom')
	})

	it('rejects a command that declares its own format option', async () => {
		await expect(
			runScript(
				{ options: { format: { description: 'f' } } as any, run: () => ({}) },
				{ argv: [], streams: streams().streams }
			)
		).rejects.toThrow("cannot declare its own 'format'")
	})

	it('runs the same definition as cli().command()', async () => {
		const greet = {
			name: 'greet',
			description: 'greet',
			options: { name: { description: 'who', type: t.string() } },
			run: ({ name }: { name: string }) => result({ greeting: `hello ${name}` })
		}
		const viaCli = streams()
		const c = cli({ name: 'app', version: '1.0.0', streams: viaCli.streams }).command(greet)
		await c.parse(['node', 'app', 'greet', '--name', 'ann'])
		const viaScript = streams()
		expect(await runScript(greet, { argv: ['--name', 'ann'], streams: viaScript.streams })).toBe(0)
		expect(viaScript.out.join('')).toBe(viaCli.out.join(''))
		expect(viaScript.out.join('')).toBe('greeting: hello ann\n')
	})

	// type checks only: the functions are never called
	it('types args from the options', () => {
		const _typed = () =>
			runScript({
				options: { n: { description: 'n', type: t.number() }, s: { description: 's', type: t.string().optional() } },
				run(args) {
					const n: number = args.n
					const s: string | undefined = args.s
					// @ts-expect-error `s` is optional
					const bad: string = args.s
					return [n, s, bad]
				}
			})
		expect(_typed).toBeTypeOf('function')
	})

	it('types args from the arguments', () => {
		const _typed = () =>
			runScript({
				arguments: [
					{ name: 'src', description: 'from' },
					{ name: 'n', description: 'count', type: t.number().optional() }
				],
				run(args) {
					const src: string = args.src
					const n: number | undefined = args.n
					// @ts-expect-error `n` is optional
					const bad: number = args.n
					return [src, n, bad]
				}
			})
		expect(_typed).toBeTypeOf('function')
	})

	it('makes this.config a type error', () => {
		const _typed = () =>
			runScript({
				run() {
					// @ts-expect-error there is no config headless
					return this.config
				}
			})
		expect(_typed).toBeTypeOf('function')
	})
})
