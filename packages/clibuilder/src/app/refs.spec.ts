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
