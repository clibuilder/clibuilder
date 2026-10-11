import { Writable } from 'node:stream'
import { z } from 'zod'
import { mockContext } from '../drivers/context.mock.js'
import { type cli, command, cli as createCli, exitCodes, t } from '../index.js'
import { argv } from '../test-utils/index.js'
import { builder } from './builder.js'

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

const show = command({
	name: 'show',
	description: 'show a task',
	arguments: [{ name: 'id', description: 'the id', type: t.int() }],
	options: {
		port: { type: t.int({ min: 1, max: 65535 }).optional(), description: 'the port' },
		priority: { type: t.enum(['low', 'normal', 'high']).optional(), description: 'the priority' },
		tag: { type: t.string({ pattern: /^v\d+$/ }).optional(), description: 'the tag' },
		full: { type: t.boolean().optional(), description: 'everything', conflicts: ['brief'] },
		brief: { type: t.boolean().optional(), description: 'a summary' }
	},
	run() {
		return undefined
	}
})

const group = command({
	name: 'task',
	description: 'tasks',
	commands: [command({ name: 'add', run() {} }), command({ name: 'remove', run() {} })]
})

async function run(args: string, options: Partial<cli.Options> = {}) {
	const stdout = memoryStream()
	const stderr = memoryStream()
	let ran = false
	const code = await createCli({
		name: 'app',
		version: '1.0.0',
		output: 'axi',
		streams: { stdout, stderr },
		...options
	})
		.command({ ...show, run: () => void (ran = true) })
		.command(group)
		.parse(['node', 'app', ...args.split(' ').filter(Boolean)])
	return { code, ran, stdout: stdout.text, stderr: stderr.text, exitCode: process.exitCode }
}

afterEach(() => {
	process.exitCode = undefined
})

describe('usage errors under output axi', () => {
	it.each<[string, string, Record<string, unknown>]>([
		[
			'show 1 --bogus',
			'unknown-option',
			{
				error: 'unknown option --bogus',
				option: '--bogus',
				help: [
					'Usage: app show <arguments> [options]',
					'valid options for `show`: --port, --priority, --tag, --full, --brief (--help always allowed)'
				]
			}
		],
		[
			'show 1 --full --brief',
			'conflicting-options',
			{
				error: 'option --full cannot be used with option --brief',
				option: '--full',
				conflictsWith: '--brief',
				help: ['Usage: app show <arguments> [options]']
			}
		],
		[
			'show 1 --port 70000',
			'invalid-value',
			{
				error: 'invalid value for option --port: expected an integer from 1 to 65535, received "70000"',
				option: '--port',
				value: '70000',
				help: ['Usage: app show <arguments> [options]', 'expected for --port: int 1..65535 (received "70000")']
			}
		],
		[
			'show 1 --priority urgent',
			'invalid-value',
			{
				option: '--priority',
				value: 'urgent',
				help: ['Usage: app show <arguments> [options]', 'allowed for --priority: low, normal, high (received "urgent")']
			}
		],
		[
			'show 1 --tag x1',
			'invalid-value',
			{
				option: '--tag',
				value: 'x1',
				help: ['Usage: app show <arguments> [options]', 'expected for --tag: string /^v\\d+$/ (received "x1")']
			}
		],
		[
			'show abc',
			'invalid-value',
			{
				argument: 'id',
				value: 'abc',
				help: ['Usage: app show <arguments> [options]', 'expected for <id>: int (received "abc")']
			}
		],
		[
			'show 1 --port 1 --port 2',
			'expect-single',
			{
				error: 'option --port expects a single value, received: 1, 2',
				option: '--port',
				value: ['1', '2'],
				help: ['Usage: app show <arguments> [options]']
			}
		],
		[
			'show',
			'missing-argument',
			{
				error: 'missing required argument <id>',
				argument: 'id',
				help: ['Usage: app show <arguments> [options]', '`show` takes: <id>']
			}
		],
		[
			'show 1 2 3',
			'extra-arguments',
			{
				error: 'unexpected arguments: 2, 3',
				arguments: ['2', '3'],
				help: ['Usage: app show <arguments> [options]', '`show` takes: <id>']
			}
		],
		[
			'nope',
			'extra-arguments',
			{
				arguments: ['nope'],
				help: ['Usage: app <command> [options]', 'valid commands for `app`: show, task']
			}
		]
	])('`%s` is reported as %s on stdout, exit 2, nothing on stderr', async (args, code, expected) => {
		const r = await run(`${args} --format json`)
		expect(r.code).toBe(exitCodes.usage)
		expect(r.exitCode).toBe(exitCodes.usage)
		expect(r.ran).toBe(false)
		expect(r.stderr).toBe('')
		expect(r.stdout.endsWith('}\n')).toBe(true)
		const report = JSON.parse(r.stdout)
		expect(report).toMatchObject({ code, ...expected })
		// only the documented keys, in order: error, code, the details, help
		expect(Object.keys(report)[0]).toBe('error')
		expect(Object.keys(report)[1]).toBe('code')
		const keys = Object.keys(report)
		expect(keys[keys.length - 1]).toBe('help')
	})

	it('reports only the top-ranked error, in the ranking order', async () => {
		// missing argument, invalid value and unknown option at once: the unknown option leads
		let r = await run('show --port 0 --bogus --format json')
		expect(JSON.parse(r.stdout)).toMatchObject({ code: 'unknown-option', error: 'unknown option --bogus' })
		// conflicting options outrank an invalid value and a missing argument
		r = await run('show --port 0 --full --brief --format json')
		expect(JSON.parse(r.stdout)).toMatchObject({ code: 'conflicting-options' })
		// an invalid value outranks a repeated option and a missing argument
		r = await run('show --tag v1 --tag v2 --port 0 --format json')
		expect(JSON.parse(r.stdout)).toMatchObject({ code: 'invalid-value', option: '--port' })
		// a repeated option outranks a missing argument
		r = await run('show --tag v1 --tag v2 --format json')
		expect(JSON.parse(r.stdout)).toMatchObject({ code: 'expect-single' })
		// one error is reported, never a list
		expect(r.stdout.split('\n').filter(Boolean)).toHaveLength(1)
	})

	it('writes toon by default', async () => {
		const r = await run('show 1 --priority urgent')
		expect(r.stdout).toBe(
			[
				"error: \"invalid value for option --priority: expected one of 'low', 'normal', 'high', received \\\"urgent\\\"\"",
				'code: invalid-value',
				'option: "--priority"',
				'value: urgent',
				'help[2]: "Usage: app show <arguments> [options]","allowed for --priority: low, normal, high (received \\"urgent\\")"',
				''
			].join('\n')
		)
	})

	it('writes in the cli format', async () => {
		const r = await run('show 1 --bogus', { format: 'text' })
		expect(r.stdout).toBe(
			[
				'error: unknown option --bogus',
				'code: unknown-option',
				'option: --bogus',
				'',
				'help:',
				'  - Usage: app show <arguments> [options]',
				'  - valid options for `show`: --port, --priority, --tag, --full, --brief (--help always allowed)',
				''
			].join('\n')
		)
	})

	it('reports a bad --format in the default format, with the allowed formats', async () => {
		const r = await run('show 1 --format yaml', { format: 'json' })
		expect(r.code).toBe(exitCodes.usage)
		expect(JSON.parse(r.stdout)).toEqual({
			error: `invalid value for option --format: expected one of 'toon', 'json', 'text', received "yaml"`,
			code: 'invalid-value',
			option: '--format',
			value: 'yaml',
			help: ['Usage: app show <arguments> [options]', 'allowed for --format: toon, json, text (received "yaml")']
		})
	})

	it('reports a bare group as missing-command, listing its sub-commands, without the full help', async () => {
		const r = await run('task --format json')
		expect(r.code).toBe(exitCodes.usage)
		expect(r.exitCode).toBe(exitCodes.usage)
		expect(r.stderr).toBe('')
		expect(JSON.parse(r.stdout)).toEqual({
			error: 'missing command for `app task`',
			code: 'missing-command',
			command: 'app task',
			help: ['Usage: app task <command>', 'valid commands for `app task`: add, remove']
		})
	})

	it('reports a cli with no default command invoked bare as missing-command', async () => {
		const r = await run('')
		expect(r.code).toBe(exitCodes.usage)
		expect(r.stdout).toContain('code: missing-command')
		expect(r.stdout).toContain('valid commands for `app`: show, task')
		expect(r.stdout).not.toContain('Commands:')
	})

	it('lets a cli onUsageError handler take over', async () => {
		const handler = vi.fn(() => 3)
		const r = await run('show 1 --bogus', { onUsageError: handler })
		expect(handler).toHaveBeenCalledOnce()
		expect(handler.mock.calls[0]).toMatchObject([
			[{ type: 'invalid-key', key: 'bogus' }],
			{ format: 'toon', exitCode: exitCodes.usage }
		])
		expect(r.code).toBe(3)
		expect(r.stdout).toBe('')
		expect(r.stderr).toBe('')
	})

	it("lets a command's own onUsageError handler take over", async () => {
		const stdout = memoryStream()
		const stderr = memoryStream()
		const onUsageError = vi.fn()
		const code = await createCli({ name: 'app', version: '1.0.0', output: 'axi', streams: { stdout, stderr } })
			.command({ ...show, onUsageError })
			.parse(['node', 'app', 'show', '1', '--bogus'])
		expect(onUsageError).toHaveBeenCalledOnce()
		expect(code).toBe(exitCodes.usage)
		expect(stdout.text).toBe('')
		expect(stderr.text).toBe('')
	})
})

describe('usage errors under output console are unchanged', () => {
	it('prints every error and the full help, exit 2', async () => {
		const r = await run('show --bogus', { output: 'console' })
		expect(r.code).toBe(exitCodes.usage)
		expect(r.stderr).toBe('missing required argument <id>\nunknown option --bogus\n')
		expect(r.stdout).toMatch(/^\nUsage: app show <arguments> \[options\]/)
		expect(r.stdout).toContain('Options:')
	})

	it('shows the full help for a bare group, exit 2', async () => {
		const r = await run('task', { output: 'console' })
		expect(r.code).toBe(exitCodes.usage)
		expect(r.stderr).toBe('')
		expect(r.stdout).toMatch(/^\nUsage: app task <command>/)
		expect(r.stdout).toContain('Commands:')
	})
})

describe('a config failing the command schema', () => {
	async function runWithConfig(config: unknown, output: cli.Output, format?: cli.Format) {
		const ctx = mockContext()
		ctx.loadConfig = async () => config
		const result = await builder(ctx, { name: 'app', version: '1.0.0', output, format })
			.default({
				config: z.object({ port: z.number(), name: z.string() }),
				run() {
					expect.fail('should not run')
				}
			})
			.parse(argv('app'))
		return { result, stdout: ctx.stdout, messages: ctx.messages, exitCode: ctx.exitCode }
	}

	it('is reported as invalid-config on stdout under output axi, without the help, exit 1', async () => {
		const r = await runWithConfig({ port: 'x' }, 'axi', 'json')
		expect(r.exitCode).toBe(exitCodes.error)
		expect(r.result).toBe(exitCodes.error)
		expect(JSON.parse(r.stdout)).toEqual({
			error: 'config fails validation',
			code: 'invalid-config',
			port: ['Expected number, received string'],
			name: ['Required']
		})
		// nothing through the ui: the mock records only the exit
		expect(r.messages).toBe('exit with 1')
	})

	it('reports an error about the config as a whole under (config), under output axi', async () => {
		const r = await runWithConfig('not an object', 'axi', 'json')
		expect(JSON.parse(r.stdout)).toEqual({
			error: 'config fails validation',
			code: 'invalid-config',
			'(config)': ['Expected object, received string']
		})
	})

	it('names the required keys when there is no config, under output axi', async () => {
		const r = await runWithConfig(undefined, 'axi', 'json')
		expect(JSON.parse(r.stdout)).toEqual({
			error: 'config fails validation',
			code: 'invalid-config',
			port: ['Required'],
			name: ['Required']
		})
	})

	it('is printed field by field with the help under output console, as before', async () => {
		const r = await runWithConfig({ port: 'x' }, 'console')
		expect(r.exitCode).toBe(exitCodes.error)
		expect(r.stdout).toBe('')
		expect(r.messages).toContain('config fails validation:\n  port: Expected number, received string')
		expect(r.messages).toContain('Usage: app')
	})
})
