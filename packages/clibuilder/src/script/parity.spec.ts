import { CliError, exitCodes, result, runScript } from '../axi.js'
import { cli, t } from '../index.js'

// one command definition, run through both entries: `cli().command()` and `runScript()`
const greet = {
	name: 'greet',
	description: 'greet someone',
	options: {
		name: { description: 'who', type: t.string() },
		times: { description: 'how often', type: t.number(), default: 1 },
		fail: { description: 'fail with a CliError', type: t.string().optional() },
		quiet: { description: 'fail without a report' }
	},
	run({ name, times, fail, quiet }: { name: string; times: number; fail?: string | undefined; quiet?: boolean }) {
		if (quiet) throw CliError.reported(4)
		if (fail)
			throw new CliError(`cannot greet ${name}`, { code: fail, details: { name }, help: 'try again', exitCode: 3 })
		return result({ greeting: `hello ${name}`, times })
	}
}

async function viaCli(args: string[]) {
	const out: string[] = []
	const err: string[] = []
	const app = cli({
		name: 'app',
		version: '1.0.0',
		streams: {
			stdout: { write: (s: string) => out.push(s) } as any,
			stderr: { write: (s: string) => err.push(s) } as any
		}
	})
	await app.command(greet as any).parse(['node', 'app', 'greet', ...args])
	const exitCode = process.exitCode ?? 0
	process.exitCode = undefined
	return { out: out.join(''), err: err.join(''), exitCode }
}

async function viaScript(args: string[]) {
	const out: string[] = []
	const err: string[] = []
	const exitCode = await runScript(greet, {
		argv: args,
		streams: { stdout: { write: (s) => out.push(s) }, stderr: { write: (s) => err.push(s) } }
	})
	return { out: out.join(''), err: err.join(''), exitCode }
}

afterEach(() => {
	process.exitCode = undefined
})

describe.each(['toon', 'json', 'text'])('one command through cli() and runScript(), --format %s', (format) => {
	it.each([
		['an answer', ['--name', 'ann']],
		['an answer with a default overridden', ['--name', 'ann', '--times', '3']],
		['a CliError', ['--name', 'ann', '--fail', 'not-found']],
		['a reported CliError', ['--name', 'ann', '--quiet']]
	])('gives the same output and exit code for %s', async (_, args) => {
		const argv = [...args, '--format', format]
		const a = await viaCli(argv)
		const b = await viaScript(argv)
		expect(b.out).toBe(a.out)
		expect(b.exitCode).toBe(a.exitCode)
		expect(b.out === '').toBe(args.includes('--quiet'))
	})

	it('exits with the CliError exit code', async () => {
		expect((await viaScript(['--name', 'ann', '--fail', 'x', '--format', format])).exitCode).toBe(3)
	})

	// a usage error is reported by both, in the caller's format, with exit 2.
	// `runScript()` does not rank them: it reports code `usage`, where `cli()` reports the coded kind (#706)
	it.each([
		['an unknown option', ['--name', 'ann', '--nope'], 'unknown-option'],
		['a bad value', ['--name', 'ann', '--times', 'abc'], 'invalid-value']
	])('reports %s as a usage error with exit 2', async (_, args, code) => {
		const argv = [...args, '--format', format]
		const a = await viaCli(argv)
		const b = await viaScript(argv)
		expect(a.exitCode).toBe(exitCodes.usage)
		expect(b.exitCode).toBe(exitCodes.usage)
		expect(a.out).toContain(code)
		expect(b.out).toContain('usage')
		expect(b.out).toContain('error')
		expect(a.out).toContain('error')
	})
})
