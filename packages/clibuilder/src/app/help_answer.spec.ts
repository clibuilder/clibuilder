import { Writable } from 'node:stream'
import { decode } from '@toon-format/toon'
import { z as z4 } from 'zod4'
import { cli, command, t } from '../index.js'
import { generateHelpMessage } from '../render/help.js'

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

const deploy = command({
	name: 'deploy',
	description: 'Deploy the app\nwith more detail',
	arguments: [{ name: 'target', description: 'where to deploy', type: t.enum(['prod', 'dev']) }],
	options: {
		port: { type: t.int({ min: 1, max: 65535 }), description: 'port to listen on', alias: ['p'], default: 80 }
	},
	examples: [{ command: 'app deploy prod --port 8080', description: 'Deploy to production on port 8080' }],
	run() {}
})

const group = command({
	name: 'remote',
	description: 'Manage remotes\nin detail',
	commands: [
		command({ name: 'add', description: 'Add a remote\nwith a url', run() {} }),
		command({ name: 'remove', alias: ['rm'], description: 'Remove a remote', run() {} })
	]
})

/**
 * Runs `args` against a cli with the `deploy` command and the `remote` group.
 */
async function run(args: string, options: Partial<cli.Options> = { output: 'axi' }, ...commands: cli.Command[]) {
	const stdout = memoryStream()
	const stderr = memoryStream()
	let app = cli({ name: 'app', version: '1.2.3', description: 'an app', streams: { stdout, stderr }, ...options })
		.command(deploy)
		.command(group)
	for (const c of commands) app = app.command(c)
	const value = await app.parse(['node', 'app', ...args.split(' ').filter(Boolean)])
	return { value, stdout: stdout.text, stderr: stderr.text, exitCode: process.exitCode }
}

afterEach(() => {
	process.exitCode = undefined
})

describe('--help under output axi', () => {
	it.each([
		['a command', 'deploy --help'],
		['a group', 'remote --help'],
		['the root', '--help']
	])('answers for %s in toon by default, on stdout only, exit 0', async (_, args) => {
		const r = await run(args)
		expect(r.stderr).toBe('')
		expect(r.exitCode).toBeUndefined()
		expect(r.stdout.endsWith('\n')).toBe(true)
		expect(decode(r.stdout)).toEqual(JSON.parse((await run(`${args} --format json`)).stdout))
	})

	it('answers the structured help of a command in json', async () => {
		const r = await run('deploy --help --format json')
		expect(r.stderr).toBe('')
		expect(r.exitCode).toBeUndefined()
		const help = JSON.parse(r.stdout)
		expect(help).toMatchObject({
			name: 'app deploy',
			usage: 'app deploy <arguments> [options]',
			description: 'Deploy the app\nwith more detail',
			arguments: [
				{ name: 'target', required: true, type: 'enum', values: ['prod', 'dev'], description: 'where to deploy' }
			],
			options: [
				{
					name: 'port',
					aliases: ['p'],
					type: 'int',
					min: 1,
					max: 65535,
					required: false,
					default: 80,
					description: 'port to listen on'
				}
			],
			examples: [{ command: 'app deploy prod --port 8080', description: 'Deploy to production on port 8080' }]
		})
		expect(help.commands).toBeUndefined()
	})

	it('lists the global options once', async () => {
		const help = JSON.parse((await run('deploy --help --format json')).stdout)
		expect(help.globalOptions.map((o: any) => o.name)).toEqual([
			'help',
			'version',
			'verbose',
			'silent',
			'debug-cli',
			'format'
		])
		expect(help.globalOptions.find((o: any) => o.name === 'format')).toMatchObject({ default: 'toon' })
	})

	it('keeps the global options out of the root options', async () => {
		const help = JSON.parse((await run('--help --format json')).stdout)
		expect(help.name).toBe('app')
		expect(help.options).toBeUndefined()
		expect(help.globalOptions).toHaveLength(6)
		expect(help.commands).toEqual([
			{ name: 'deploy', description: 'Deploy the app' },
			{ name: 'remote', description: 'Manage remotes' }
		])
	})

	it('keeps group help compact: sub-command names, aliases and one-line descriptions', async () => {
		const help = JSON.parse((await run('remote --help --format json')).stdout)
		expect(help).toMatchObject({ name: 'app remote', usage: 'app remote <command>' })
		expect(help.commands).toEqual([
			{ name: 'add', description: 'Add a remote' },
			{ name: 'remove', aliases: ['rm'], description: 'Remove a remote' }
		])
	})

	it.each([
		['a command', 'deploy', deploy],
		['a group', 'remote', group]
	])('answers for %s in text with the text help, unchanged', async (_, name, c) => {
		const r = await run(`${name} --help --format text`)
		expect(r.stdout).toBe(`${generateHelpMessage('app', { ...c, parent: { name: '' } as any })}\n`)
		expect(r.stderr).toBe('')
	})

	it('answers in the cli({ format }) default when --format is not passed', async () => {
		const r = await run('deploy --help', { output: 'axi', format: 'json' })
		expect(JSON.parse(r.stdout).name).toBe('app deploy')
	})

	it('is answered under --silent: an answer is not a diagnostic', async () => {
		const r = await run('deploy --help --silent --format json')
		expect(JSON.parse(r.stdout).name).toBe('app deploy')
	})

	it('reads types, hidden aliases, conflicts and config like the text help', async () => {
		const r = await run(
			'typed --help --format json',
			{ output: 'axi' },
			command({
				name: 'typed',
				arguments: [{ name: 'files', description: 'files', type: t.array(t.string()).optional() }],
				options: {
					name: { type: t.string(), description: 'a name', alias: ['n', { alias: 'secret', hidden: true }] },
					all: { type: t.boolean().optional(), description: 'all', conflicts: ['name'] },
					size: { type: t.number().optional(), description: 'size' }
				},
				config: z4.object({ a: z4.string() }),
				run() {}
			})
		)
		const help = JSON.parse(r.stdout)
		expect(help.arguments).toEqual([
			{ name: 'files', required: false, type: 'string', array: true, description: 'files' }
		])
		expect(help.options).toEqual([
			{ name: 'name', aliases: ['n'], type: 'string', required: true, description: 'a name', conflicts: ['all'] },
			{ name: 'all', type: 'boolean', required: false, description: 'all', conflicts: ['name'] },
			{ name: 'size', type: 'number', required: false, description: 'size' }
		])
		expect(help.config).toBe('{ a: string }')
	})

	it('describes t.string({ pattern }), t.literal, t.array and t.boolean', async () => {
		const r = await run(
			'desc --help --format json',
			{ output: 'axi' },
			command({
				name: 'desc',
				options: {
					tag: { type: t.string({ pattern: /^v\d+$/ }).optional(), description: 'tag' },
					mode: { type: t.literal('fast').optional(), description: 'mode' },
					ports: { type: t.array(t.int({ min: 1 })).optional(), description: 'ports' },
					dry: { type: t.boolean().optional(), description: 'dry run' }
				},
				run() {}
			})
		)
		expect(JSON.parse(r.stdout).options).toEqual([
			{ name: 'tag', type: 'string', pattern: '/^v\\d+$/', required: false, description: 'tag' },
			{ name: 'mode', type: 'literal', values: ['fast'], required: false, description: 'mode' },
			{ name: 'ports', type: 'int', min: 1, array: true, required: false, description: 'ports' },
			{ name: 'dry', type: 'boolean', required: false, description: 'dry run' }
		])
	})

	it('leaves out what a declaration does not say', async () => {
		const r = await run(
			'bare --help --format json',
			{ output: 'axi' },
			command({
				name: 'bare',
				arguments: [{ name: 'value', description: '' }],
				options: {
					level: { description: '', alias: [{ alias: 'l', hidden: false }] }
				},
				commands: [command({ name: 'sub', run() {} })],
				run() {}
			})
		)
		const help = JSON.parse(r.stdout)
		expect(help.description).toBeUndefined()
		expect(help.arguments).toEqual([{ name: 'value', required: true }])
		expect(help.options).toEqual([{ name: 'level', aliases: ['l'], required: false }])
		expect(help.commands).toEqual([{ name: 'sub' }])
	})

	it('describes t.number and t.int with one bound or none', async () => {
		const r = await run(
			'nums --help --format json',
			{ output: 'axi' },
			command({
				name: 'nums',
				options: {
					ratio: { type: t.number({ max: 1 }).optional(), description: 'ratio' },
					count: { type: t.int().optional(), description: 'count' },
					name: { type: t.string().optional(), description: 'name' }
				},
				run() {}
			})
		)
		expect(JSON.parse(r.stdout).options).toEqual([
			{ name: 'ratio', type: 'number', max: 1, required: false, description: 'ratio' },
			{ name: 'count', type: 'int', required: false, description: 'count' },
			{ name: 'name', type: 'string', required: false, description: 'name' }
		])
	})

	it('agrees with the text help on names, options and sub-commands', async () => {
		for (const name of ['deploy', 'remote', '']) {
			const text = (await run(`${name} --help --format text`)).stdout
			const help = JSON.parse((await run(`${name} --help --format json`)).stdout)
			expect(text).toContain(`Usage: ${help.usage}`)
			for (const o of help.options ?? []) expect(text).toContain(`--${o.name}`)
			for (const o of help.globalOptions ?? []) {
				if (name === '') expect(text).toContain(`--${o.name}`)
			}
			for (const a of help.arguments ?? []) expect(text).toContain(a.name)
			for (const c of help.commands ?? []) expect(text).toContain(c.name)
			for (const e of help.examples ?? []) {
				expect(text).toContain(e.command)
				expect(text).toContain(e.description)
			}
		}
	})
})

describe('--version under output axi', () => {
	it.each(['--version', '-v'])('a bare %s answers the plain version on stdout', async (args) => {
		const r = await run(args)
		expect(r.stdout).toBe('1.2.3\n')
		expect(r.stderr).toBe('')
		expect(r.exitCode).toBeUndefined()
	})

	it.each([
		'deploy --version',
		'deploy -v',
		'remote add --version'
	])('%s --format json answers the plain version on stdout, not encoded', async (args) => {
		const r = await run(`${args} --format json`)
		expect(r.stdout).toBe('1.2.3\n')
		expect(r.stderr).toBe('')
		expect(r.exitCode).toBeUndefined()
	})
})

describe('--version under output axi without a version', () => {
	it('says so in plain text after a command', async () => {
		const stdout = memoryStream()
		const stderr = memoryStream()
		await cli({ name: 'app', version: '', streams: { stdout, stderr }, output: 'axi' })
			.command(deploy)
			.parse(['node', 'app', 'deploy', '--version'])
		expect(stdout.text).toBe('not versioned\n')
		expect(stderr.text).toBe('')
	})
})

describe('ui.showHelp() and ui.showVersion() from run()', () => {
	const self = command({
		name: 'self',
		description: 'shows its own help',
		options: { version: { type: t.boolean().optional(), description: 'unused' } },
		run() {
			this.ui.showHelp()
			this.ui.showVersion()
		}
	})
	const selfHelp = command({
		name: 'self-help',
		description: 'shows its own help',
		run() {
			this.ui.showHelp()
		}
	})
	const selfVersion = command({
		name: 'self-version',
		run() {
			this.ui.showVersion()
		}
	})

	it.each([
		'toon',
		'json'
	] as const)('under output axi writes the help on stdout in %s, like --help', async (format) => {
		const r = await run(`self-help --format ${format}`, { output: 'axi' }, selfHelp)
		expect(r.stdout).toBe((await run(`self-help --help --format ${format}`, { output: 'axi' }, selfHelp)).stdout)
		expect(r.stderr).toBe('')
	})

	it('under output axi writes the text help on stdout under --format text', async () => {
		const r = await run('self-help --format text', { output: 'axi' }, selfHelp)
		expect(r.stdout).toContain('Usage: app self-help')
		expect(r.stderr).toBe('')
	})

	it('under output axi writes the plain version on stdout', async () => {
		const r = await run('self-version --format json', { output: 'axi' }, selfVersion)
		expect(r.stdout).toBe('1.2.3\n')
		expect(r.stderr).toBe('')
	})

	it('under output console writes the text help and the version through the ui, as before', async () => {
		const r = await run('self', { output: 'console' }, self)
		expect(r.stdout).toBe(`${generateHelpMessage('app', { ...self, parent: { name: '' } as any })}\n1.2.3\n`)
		expect(r.stderr).toBe('')
	})
})

describe('examples', () => {
	it('are shown under the command text help in console output', async () => {
		const r = await run('deploy --help', { output: 'console' })
		expect(r.stdout).toContain(
			['Examples:', '  Deploy to production on port 8080', '    app deploy prod --port 8080'].join('\n')
		)
	})

	it('add no section when a command declares none', async () => {
		const r = await run('remote --help', { output: 'console' })
		expect(r.stdout).not.toContain('Examples:')
	})

	it('are on the command a usage error handler receives', async () => {
		let examples: unknown
		await run('deploy', {
			output: 'axi',
			onUsageError(_, { command }) {
				examples = command?.examples
			}
		})
		expect(examples).toEqual(deploy.examples)
	})
})
