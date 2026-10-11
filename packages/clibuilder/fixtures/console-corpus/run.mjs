// Runs one corpus of invocations against a build of clibuilder and records what each wrote.
//
// Usage: node run.mjs <clibuilder module url> <output json file> <extra cli options as json>
//
// `console-corpus.spec.ts` runs it against clibuilder 11.5.0 and against this build in
// `output: 'console'`, to show the console output is the 11.x output byte for byte.
// It is a separate process so the 11.x logger writes to a real `process.stdout`.
import { writeFileSync } from 'node:fs'

const [, , moduleUrl, outFile, extraJson] = process.argv
const { cli, CliError, t, command } = await import(moduleUrl)
const extra = JSON.parse(extraJson)

const app = (options = {}) => cli({ name: 'app', version: '1.0.0', ...options, ...extra })

const say = {
	run() {
		this.ui.info('info line')
		this.ui.warn('warn line')
		this.ui.error('error line')
		this.ui.debug('debug line')
		return { count: 1 }
	}
}
const show = command({
	name: 'show',
	description: 'show a thing',
	arguments: [{ name: 'id', description: 'the id', type: t.string() }],
	options: { all: { description: 'show all', type: t.boolean().optional(), alias: ['a'] } },
	run(args) {
		this.ui.info('show', args.id)
		return args
	}
})
const group = command({
	name: 'group',
	description: 'a group',
	commands: [
		command({
			name: 'sub',
			run() {
				this.ui.info('sub ran')
			}
		})
	]
})
const fail = command({
	name: 'fail',
	run() {
		throw new CliError('no plugin named foo', { exitCode: 4, help: ['run `app list`', 'run `app add <name>`'] })
	}
})
const failAsync = command({
	name: 'fail-async',
	async run() {
		await new Promise((resolve) => setTimeout(resolve, 1))
		throw new CliError('later')
	}
})
const selfHelp = command({
	name: 'self-help',
	run() {
		this.ui.showHelp()
		this.ui.showVersion()
	}
})
const pick = command({
	name: 'pick',
	options: {
		full: { description: 'full output', conflicts: ['lines'] },
		lines: { description: 'line count', type: t.number().optional(), default: 10 }
	},
	run() {}
})
const full = () =>
	app({ description: 'a test app' })
		.command(show)
		.command(group)
		.command(fail)
		.command(failAsync)
		.command(selfHelp)
		.command(pick)

const cases = [
	['a default command: ui lines, the returned value not printed', () => app().default(say), ''],
	['a default command under --silent', () => app().default(say), '--silent'],
	['--help', full, '--help'],
	['-h', full, '-h'],
	['a bare --version', full, '--version'],
	['a bare -v', full, '-v'],
	['--version after a command', full, 'show x --version'],
	['--help for a command', full, 'show --help'],
	['--help for a group', full, 'group --help'],
	['-h for a sub command', full, 'group sub -h'],
	['a command', full, 'show x'],
	['a command with a flag alias', full, 'show x -a'],
	['a sub command', full, 'group sub'],
	['a bare group', full, 'group'],
	['a bare cli', full, ''],
	['an unknown command', full, 'nope'],
	['an unknown option', full, 'show x --bogus'],
	['a missing argument', full, 'show'],
	['extra arguments', full, 'show x y'],
	['an invalid boolean', full, 'show x --all=maybe'],
	['conflicting options', full, 'pick --full --lines=3'],
	['an invalid number', full, 'pick --lines=abc'],
	['several usage errors', full, 'show --bogus --zap'],
	['a malformed global option under a command', full, 'show x --silent=nope'],
	['a CliError', full, 'fail'],
	['a CliError thrown asynchronously', full, 'fail-async'],
	['a CliError under --silent', full, 'fail --silent'],
	['ui.showHelp() and ui.showVersion() from run()', full, 'self-help']
]

const results = []
for (const [name, build, args] of cases) {
	let stdout = ''
	let stderr = ''
	const writeStdout = process.stdout.write
	const writeStderr = process.stderr.write
	process.stdout.write = (chunk) => {
		stdout += chunk
		return true
	}
	process.stderr.write = (chunk) => {
		stderr += chunk
		return true
	}
	process.exitCode = undefined
	let value
	try {
		value = await build().parse(['node', 'app', ...args.split(' ').filter(Boolean)])
	} catch (e) {
		value = `threw: ${e?.message}`
	} finally {
		process.stdout.write = writeStdout
		process.stderr.write = writeStderr
	}
	results.push({ name, args, stdout, stderr, exitCode: process.exitCode ?? 0, value })
	process.exitCode = undefined
}
writeFileSync(outFile, JSON.stringify(results, null, 2))
