import { Writable } from 'node:stream'
import { CliError, cli, placeholder, ref, result, t } from '../index.js'
import { helpLinesOf } from './errors.js'

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

async function run(returns: () => unknown, args: string[] = [], options: Partial<cli.Options> = {}) {
	const stdout = memoryStream()
	const stderr = memoryStream()
	await cli({ name: 'app', version: '1.0.0', streams: { stdout, stderr }, ...options })
		.command({
			name: 'task',
			commands: [
				{
					name: 'get',
					alias: ['g'],
					options: { gid: { description: 'id', type: t.string() } },
					run() {}
				}
			]
		})
		.command({
			name: 'show',
			run() {
				return returns()
			}
		})
		.parse(['node', 'app', 'show', ...args])
	return { stdout: stdout.text, stderr: stderr.text }
}

afterEach(() => {
	process.exitCode = undefined
})

describe('ref() under cli()', () => {
	it('renders as a help string with the cli name by default', async () => {
		const r = await run(() => result({ id: 1 }, { help: ref('task get', { gid: '12' }, 'see it') }))
		expect(r.stdout).toBe('id: 1\nhelp[1]: Run `app task get --gid 12` to see it\n')
	})

	it("renders as next[N]{run,why} with cli({ refs: 'next' })", async () => {
		const r = await run(
			() => result({ id: 1 }, { help: ref('task get', { gid: placeholder('gid') }, 'see one') }),
			['--format', 'json'],
			{ refs: 'next' }
		)
		expect(r.stdout).toBe('{"id":1,"next":[{"run":"app task get --gid <gid>","why":"see one"}]}\n')
	})

	it('accepts an alias in the path and a global option', async () => {
		const r = await run(() => result({ id: 1 }, { help: ref('task g', { format: 'json' }) }))
		expect(r.stdout).toBe('id: 1\nhelp[1]: Run `app task g --format json`\n')
	})

	it('keeps refs in help on a CliError, even with refs: next', async () => {
		const r = await run(
			() => {
				throw new CliError('not found', { code: 'not-found', help: ref('task get', { gid: '1' }, 'retry') })
			},
			['--format', 'json'],
			{ refs: 'next' }
		)
		expect(r.stdout).toBe('{"error":"not found","code":"not-found","help":["Run `app task get --gid 1` to retry"]}\n')
	})

	it('prints the rendered help line in console output', async () => {
		const r = await run(
			() => {
				throw new CliError('not found', { help: ref('task get', {}, 'retry') })
			},
			[],
			{ output: 'console' }
		)
		expect(r.stderr).toContain('Run `app task get` to retry')
	})

	it('throws on a path that names no command', async () => {
		await expect(run(() => result(1, { help: ref('task nope') }))).rejects.toThrow(/has no command "task nope"/)
	})

	it('throws on an option the command does not have', async () => {
		await expect(run(() => result(1, { help: ref('task get', { id: 1 }) }))).rejects.toThrow(/no option "id"/)
	})

	it('rejects an unknown refs mode', () => {
		expect(() => cli({ name: 'app', version: '1', refs: 'list' as any })).toThrow(TypeError)
	})
})

// a command tree run standalone and mounted under a host group (#755)
function harness(throws = false) {
	const doctor: cli.Command = {
		name: 'doctor',
		options: { fix: { description: 'fix' } },
		run() {
			const help = [ref('init', {}, 'set it up'), ref('doctor', { fix: true })]
			if (throws) throw new CliError('broken', { help })
			return result({ ok: true }, { help })
		}
	}
	return { name: 'agent-harness', commands: [{ name: 'init', run() {} }, doctor] } as cli.Command
}

async function runMounted(
	argv: string[],
	build: (app: ReturnType<typeof cli>) => { parse(argv: string[]): Promise<unknown> }
) {
	const stdout = memoryStream()
	const stderr = memoryStream()
	await build(cli({ name: 'buddy', version: '1.0.0', streams: { stdout, stderr } })).parse(['node', 'buddy', ...argv])
	return { stdout: stdout.text, stderr: stderr.text }
}

describe('ref() relative to the issuing command (#755)', () => {
	it('renders a sibling from the root when the tree is mounted under a group', async () => {
		const r = await runMounted(['agent-harness', 'doctor'], (app) => app.command(harness()))
		expect(r.stdout).toBe(
			'ok: true\nhelp[2]: Run `buddy agent-harness init` to set it up,Run `buddy agent-harness doctor --fix`\n'
		)
	})

	it('resolves the same ref the same way when the tree runs standalone', async () => {
		const r = await runMounted(['doctor'], (app) => {
			const [init, doctor] = harness().commands as [cli.Command, cli.Command]
			return app.command(init).command(doctor)
		})
		expect(r.stdout).toBe('ok: true\nhelp[2]: Run `buddy init` to set it up,Run `buddy doctor --fix`\n')
	})

	it('resolves relatively on a CliError', async () => {
		const r = await runMounted(['agent-harness', 'doctor', '--format', 'json'], (app) => app.command(harness(true)))
		expect(r.stdout).toBe(
			'{"error":"broken","code":"error","help":["Run `buddy agent-harness init` to set it up","Run `buddy agent-harness doctor --fix`"]}\n'
		)
	})

	it('falls back to the root for a path the group does not hold', async () => {
		const r = await runMounted(['tools', 'agent-harness', 'doctor'], (app) =>
			app.command({ name: 'tools', commands: [harness()] })
		)
		expect(r.stdout).toContain('Run `buddy tools agent-harness init` to set it up')
		const top = await runMounted(['tools', 'list'], (app) =>
			app
				.command({
					name: 'tools',
					commands: [{ name: 'list', run: () => result(1, { help: [ref('tools list'), ref('setup')] }) }]
				})
				.command({ name: 'setup', run() {} })
		)
		expect(top.stdout).toBe('result: 1\nhelp[2]: Run `buddy tools list`,Run `buddy setup`\n')
	})

	it('takes the nearest group that holds the path', async () => {
		const r = await runMounted(['tools', 'show'], (app) =>
			app
				.command({
					name: 'tools',
					commands: [
						{ name: 'list', run() {} },
						{ name: 'show', run: () => result(1, { help: ref('list') }) }
					]
				})
				.command({ name: 'list', run() {} })
		)
		expect(r.stdout).toBe('result: 1\nhelp[1]: Run `buddy tools list`\n')
	})

	it('still throws on a path no enclosing group holds', async () => {
		await expect(
			runMounted(['agent-harness', 'init'], (app) =>
				app.command({
					name: 'agent-harness',
					commands: [{ name: 'init', run: () => result(1, { help: ref('nope') }) }]
				})
			)
		).rejects.toThrow(/buddy has no command "nope"/)
	})
})

describe('CliError help with a ref', () => {
	it('reads as a string without a cli name', () => {
		const e = new CliError('x', { help: ['plain', ref('task get', { gid: 1 }, 'retry')] })
		expect(e.help).toEqual(['plain', 'Run `task get --gid 1` to retry'])
	})
	it('falls back to help on a CliError from an older copy of clibuilder', () => {
		expect(helpLinesOf({ help: ['a'] } as any)).toEqual(['a'])
		expect(helpLinesOf({} as any)).toEqual([])
	})
})
