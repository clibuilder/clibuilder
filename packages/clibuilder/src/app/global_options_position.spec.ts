import { Writable } from 'node:stream'
import { type cli, cli as createCli, exitCodes, t } from '../index.js'

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

/**
 * Runs `args` against a cli with a `show` command and a `group` holding a `sub` command.
 * Each records the command that ran, its args and `this.format`.
 */
async function run(args: string, options: Partial<cli.Options> = {}) {
	const stdout = memoryStream()
	const stderr = memoryStream()
	let ran: { name: string; args: unknown; format: cli.Format } | undefined
	const code = await createCli({ name: 'app', version: '1.0.0', streams: { stdout, stderr }, ...options })
		.command({
			name: 'show',
			arguments: [{ name: 'x', type: t.string().optional(), description: 'x' }],
			options: { all: { type: t.boolean().optional(), description: 'all' } },
			run(args) {
				ran = { name: 'show', args, format: this.format }
				this.ui.info('show ran')
				this.ui.debug('show debug')
			}
		})
		.command({
			name: 'group',
			commands: [
				{
					name: 'sub',
					run(args) {
						ran = { name: 'sub', args, format: this.format }
					}
				}
			]
		})
		.parse(['node', 'app', ...args.split(' ').filter(Boolean)])
	return { code, ran, stdout: stdout.text, stderr: stderr.text, exitCode: process.exitCode }
}

afterEach(() => {
	process.exitCode = undefined
})

describe('a global option before the command path', () => {
	it('--verbose applies and the command runs', async () => {
		const r = await run('--verbose show x')
		expect(r.ran).toEqual({ name: 'show', args: { _: [], x: 'x' }, format: 'toon' })
		expect(r.stdout).toContain('show debug')
		expect(r.exitCode).toBeUndefined()
	})

	it('-V, the --verbose alias, applies and the command runs', async () => {
		const r = await run('-V show')
		expect(r.ran?.name).toBe('show')
		expect(r.stdout).toContain('show debug')
	})

	it('--silent applies and the command runs', async () => {
		const r = await run('--silent show')
		expect(r.ran?.name).toBe('show')
		expect(r.stdout).toBe('')
		expect(r.exitCode).toBeUndefined()
	})

	it('--debug-cli applies and the command runs', async () => {
		const r = await run('--debug-cli show')
		expect(r.ran?.name).toBe('show')
		expect(r.stdout).toContain('show debug')
	})

	it("--help shows the command's help", async () => {
		const r = await run('--help show')
		expect(r.ran).toBeUndefined()
		expect(r.stdout).toContain('Usage: app show')
		expect(r.exitCode).toBeUndefined()
	})

	it("--help before a group and its sub-command shows the sub-command's help", async () => {
		const r = await run('--help group sub')
		expect(r.stdout).toContain('Usage: app group sub')
	})

	it('applies before a group and its sub-command', async () => {
		const r = await run('--verbose group sub')
		expect(r.ran?.name).toBe('sub')
	})

	it('applies between a group and its sub-command', async () => {
		const r = await run('group --verbose sub')
		expect(r.ran?.name).toBe('sub')
	})
})

describe('a default command with an argument, beside a named command', () => {
	async function runDefault(args: string) {
		let ran: { name: string; args: unknown } | undefined
		await createCli({ name: 'app', version: '1.0.0', streams: { stdout: memoryStream(), stderr: memoryStream() } })
			.default({
				arguments: [{ name: 'file', description: 'file' }],
				run(args) {
					ran = { name: 'default', args }
				}
			})
			.command({
				name: 'show',
				run(args) {
					ran = { name: 'show', args }
				}
			})
			.parse(['node', 'app', ...args.split(' ')])
		return ran
	}

	it('a token after a global flag that names a command runs that command, as it does without the flag', async () => {
		expect(await runDefault('show')).toMatchObject({ name: 'show' })
		expect(await runDefault('--verbose show')).toMatchObject({ name: 'show' })
	})

	it('a token after a global flag that names no command is still the default command argument', async () => {
		expect(await runDefault('--verbose other')).toEqual({ name: 'default', args: { _: [], file: 'other' } })
	})
})

describe('a global option after the command path (control)', () => {
	it('--verbose applies as before', async () => {
		const r = await run('show --verbose x')
		expect(r.ran).toEqual({ name: 'show', args: { _: [], x: 'x' }, format: 'toon' })
		expect(r.stdout).toContain('show debug')
	})
})

describe('the global --format before the command path', () => {
	const axi = { output: 'axi' } as const

	it('takes its value and the command runs in that format', async () => {
		const r = await run('--format json show x', axi)
		expect(r.ran).toEqual({ name: 'show', args: { _: [], x: 'x' }, format: 'json' })
	})

	it('given inline, takes nothing more', async () => {
		const r = await run('--format=json show', axi)
		expect(r.ran?.format).toBe('json')
	})

	it('applies before a group and its sub-command', async () => {
		const r = await run('--format json group sub', axi)
		expect(r.ran).toMatchObject({ name: 'sub', format: 'json' })
	})

	it('applies between a group and its sub-command', async () => {
		const r = await run('group --format json sub', axi)
		expect(r.ran).toMatchObject({ name: 'sub', format: 'json' })
	})

	it('applies with cli({ format }) in the console output', async () => {
		const r = await run('--format json show', { format: 'text' })
		expect(r.ran?.format).toBe('json')
	})

	it('given a bad value, is the one usage error, under the command', async () => {
		const onUsageError = vi.fn()
		const r = await run('--format bad show', { ...axi, onUsageError })
		expect(r.ran).toBeUndefined()
		const [errors, context] = onUsageError.mock.calls[0]!
		expect(errors).toMatchObject([{ type: 'invalid-value', key: 'format', value: 'bad' }])
		expect(context.command.name).toBe('show')
		expect(r.exitCode).toBe(exitCodes.usage)
	})

	it('is not global in the console output without cli({ format }), so it does not route', async () => {
		const r = await run('--format json show')
		expect(r.ran).toBeUndefined()
		expect(r.stderr).toContain('unknown option --format')
		expect(r.exitCode).toBe(exitCodes.usage)
	})
})

describe('what stays a usage error', () => {
	it("a command's own option before the command", async () => {
		const r = await run('--all show')
		expect(r.ran).toBeUndefined()
		expect(r.stderr).toContain('unknown option --all')
		expect(r.stdout).toContain('Usage: app <command>')
		expect(r.exitCode).toBe(exitCodes.usage)
	})

	it('a command name after the terminator', async () => {
		const r = await run('-- show')
		expect(r.ran).toBeUndefined()
		expect(r.exitCode).toBe(exitCodes.usage)
	})

	it('a command name after a global flag and the terminator', async () => {
		const r = await run('--verbose -- show')
		expect(r.ran).toBeUndefined()
		expect(r.stderr).toContain('unexpected arguments: --, show')
		expect(r.exitCode).toBe(exitCodes.usage)
	})
})
