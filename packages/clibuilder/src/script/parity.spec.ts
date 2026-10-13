import { CliError, exitCodes, result, runScript } from '../axi.js'
import { cli, t } from '../index.js'

// one command definition, run through both entries: `cli().command()` and `runScript()`
const greet = {
	name: 'greet',
	description: 'greet someone',
	arguments: [
		{ name: 'name', description: 'who', type: t.string() },
		{ name: 'salutation', description: 'how', type: t.string().optional() }
	] as const,
	options: {
		times: { description: 'how often', type: t.number(), default: 1 },
		loud: { description: 'shout', conflicts: ['quiet'] },
		fail: { description: 'fail with a CliError', type: t.string().optional() },
		quiet: { description: 'fail without a report' }
	},
	run({
		name,
		salutation = 'hello',
		times,
		loud,
		fail,
		quiet
	}: {
		name: string
		salutation?: string | undefined
		times: number
		loud?: boolean | undefined
		fail?: string | undefined
		quiet?: boolean | undefined
	}) {
		if (quiet) throw CliError.reported(4)
		if (fail)
			throw new CliError(`cannot greet ${name}`, { code: fail, details: { name }, help: 'try again', exitCode: 3 })
		const greeting = `${salutation} ${name}`
		return result({ greeting: loud ? greeting.toUpperCase() : greeting, times })
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
		['an answer', ['ann']],
		['an answer with an optional argument', ['ann', 'hi']],
		['an answer with a default overridden', ['ann', '--times', '3']],
		['an answer with a flag', ['ann', '--loud']],
		['a CliError', ['ann', '--fail', 'not-found']],
		['a reported CliError', ['ann', '--quiet']]
	])('gives the same output and exit code for %s', async (_, args) => {
		const argv = [...args, '--format', format]
		const a = await viaCli(argv)
		const b = await viaScript(argv)
		expect(b.out).toBe(a.out)
		expect(b.exitCode).toBe(a.exitCode)
		expect(b.out === '').toBe(args.includes('--quiet'))
	})

	it('exits with the CliError exit code', async () => {
		expect((await viaScript(['ann', '--fail', 'x', '--format', format])).exitCode).toBe(3)
	})

	// a usage error is reported by both as the top-ranked error, coded, in the caller's format, with exit 2.
	// `runScript()` has no cli name and no `--help`, so its usage line names the command alone and its help does not offer `--help`.
	it.each([
		['an unknown option', ['ann', '--nope'], 'unknown-option'],
		['conflicting options', ['ann', '--loud', '--quiet'], 'conflicting-options'],
		['a bad value', ['ann', '--times', 'abc'], 'invalid-value'],
		['a repeated option', ['ann', '--times', '1', '--times', '2'], 'expect-single'],
		['a missing argument', [], 'missing-argument'],
		['an extra argument', ['ann', 'hi', 'there'], 'extra-arguments'],
		['the top-ranked of several errors', ['--times', 'abc', '--nope'], 'unknown-option']
	])('reports %s as a usage error with exit 2', async (_, args, code) => {
		const argv = [...args, '--format', format]
		const a = await viaCli(argv)
		const b = await viaScript(argv)
		expect(a.exitCode).toBe(exitCodes.usage)
		expect(b.exitCode).toBe(exitCodes.usage)
		expect(a.out).toContain(code)
		expect(b.out).toBe(a.out.replace('Usage: app greet', 'Usage: greet').replace(/ \(--help always allowed\)/g, ''))
	})
})

it('reports a bad --format as cli() does, in toon', async () => {
	const a = await viaCli(['ann', '--format', 'xml'])
	const b = await viaScript(['ann', '--format', 'xml'])
	expect(b.exitCode).toBe(exitCodes.usage)
	expect(b.exitCode).toBe(a.exitCode)
	expect(b.out).toContain('code: invalid-value')
	expect(b.out).toBe(a.out.replace('Usage: app greet', 'Usage: greet'))
})
