import { z } from 'zod'
import { builder } from '../app/builder.js'
import { mockContext } from '../drivers/context.mock.js'
import { type cli, command, exitCodes, t } from '../index.js'
import { argv } from '../test-utils/index.js'
import { testCommand } from '../testing/index.js'
import { convertDescriptors } from './descriptors.js'
import { lookupCommand } from './lookup.js'

/**
 * Parses `input` against `cmd` and returns what `run()` got, or the usage errors and the exit code.
 */
async function parse(cmd: cli.Command, input: string) {
	let errors: cli.UsageError[] | undefined
	const ctx = mockContext()
	const result = await builder(ctx, {
		name: 'test-cli',
		version: '1.0.0',
		onUsageError(e) {
			errors = e
		}
	})
		.command(cmd)
		.parse(argv(`test-cli ${input}`))
	return { result, errors, exitCode: ctx.exitCode }
}

function echo(options: cli.Command.Options, args?: cli.Command.Argument[]) {
	return command({
		name: 'echo',
		options,
		...(args ? { arguments: args } : {}),
		run(args) {
			const { help: _h, _: _p, ...rest } = args as Record<string, unknown>
			return rest
		}
	})
}

describe('options declared with t', () => {
	it('converts each kind from its raw value', async () => {
		const cmd = echo({
			name: { description: 'd', type: t.string() },
			ratio: { description: 'd', type: t.number() },
			port: { description: 'd', type: t.int({ min: 1, max: 65535 }) },
			dry: { description: 'd', type: t.boolean() },
			mode: { description: 'd', type: t.enum(['toon', 'json']) },
			tag: { description: 'd', type: t.array(t.string()) },
			when: { description: 'd', type: t.custom((raw) => new Date(raw)) },
			payload: { description: 'd', type: t.json<{ a: number }>() }
		})
		const { result } = await parse(
			cmd,
			'echo --name=a=b --ratio 0.5 --port=80 --dry --mode json --tag x --tag y --when 2020-01-01 --payload {"a":1}'
		)
		expect(result).toEqual({
			name: 'a=b',
			ratio: 0.5,
			port: 80,
			dry: true,
			mode: 'json',
			tag: ['x', 'y'],
			when: new Date('2020-01-01'),
			payload: { a: 1 }
		})
	})

	it('accepts an alias, and a short flag in a cluster', async () => {
		const cmd = echo({
			port: { description: 'd', type: t.int(), alias: ['p'] },
			verbose: { description: 'd', type: t.boolean().optional(), alias: [{ alias: 'V', hidden: true }] }
		})
		expect((await parse(cmd, 'echo -Vp 80')).result).toEqual({ port: 80, verbose: true })
	})

	it('applies a default and leaves an optional option undefined', async () => {
		const cmd = echo({
			port: { description: 'd', type: t.int(), default: 8080 },
			name: { description: 'd', type: t.string().optional() }
		})
		expect((await parse(cmd, 'echo')).result).toEqual({ port: 8080 })
	})

	it('gives a positional after a flag back to the arguments', async () => {
		const cmd = echo({ dry: { description: 'd', type: t.boolean().optional() } }, [
			{ name: 'file', description: 'd', type: t.string() }
		])
		expect((await parse(cmd, 'echo --dry a.txt')).result).toEqual({ dry: true, file: 'a.txt' })
	})

	it('awaits an async converter and an async check', async () => {
		const cmd = echo({
			size: {
				description: 'd',
				type: t
					.custom(async (raw) => raw.length)
					.check(async (v) => {
						await Promise.resolve()
						return v < 5 || 'too long'
					})
			}
		})
		expect((await parse(cmd, 'echo --size abc')).result).toEqual({ size: 3 })
		expect((await parse(cmd, 'echo --size abcdef')).errors).toEqual([
			{
				type: 'invalid-value',
				key: 'size',
				message: 'too long',
				value: 'abcdef',
				keyKind: 'custom',
				constraint: 'value'
			}
		])
	})

	it('accepts a Standard Schema in check() without forwarding its text', async () => {
		const cmd = echo({ email: { description: 'd', type: t.string().check(z.string().email('vendor text')) } })
		expect((await parse(cmd, 'echo --email a@b.co')).result).toEqual({ email: 'a@b.co' })
		const { errors } = await parse(cmd, 'echo --email nope')
		expect(errors).toEqual([
			{
				type: 'invalid-value',
				key: 'email',
				message: 'failed a check',
				value: 'nope',
				keyKind: 'string',
				constraint: 'string'
			}
		])
		expect(JSON.stringify(errors)).not.toContain('vendor text')
	})
})

describe('a command with several declarations', () => {
	const cmd = echo(
		{
			name: { description: 'd', type: t.string() },
			count: { description: 'd', type: t.number().optional() },
			files: { description: 'd', type: t.array(t.string()).optional() },
			port: { description: 'd', type: t.int({ min: 1 }), default: 80 },
			level: { description: 'd', type: t.enum(['low', 'high']).optional() }
		},
		[{ name: 'id', description: 'd', type: t.int() }]
	)

	it('parses each declaration by its own type', async () => {
		const { result } = await parse(cmd, 'echo 7 --name a --count 2 --files x --files y --port 81 --level high')
		expect(result).toEqual({ id: 7, name: 'a', count: 2, files: ['x', 'y'], port: 81, level: 'high' })
	})

	it('reports the errors of each, in declaration order after the arguments', async () => {
		const { errors, exitCode } = await parse(cmd, 'echo x --name a --count abc --port 0 --level mid')
		expect(exitCode).toBe(exitCodes.usage)
		expect(errors).toEqual([
			{
				type: 'invalid-value',
				key: 'id',
				message: 'expected an integer',
				value: 'x',
				keyKind: 'int',
				constraint: 'int'
			},
			{
				type: 'invalid-value',
				key: 'count',
				message: 'expected a number',
				value: 'abc',
				keyKind: 'number',
				constraint: 'number'
			},
			{
				type: 'invalid-value',
				key: 'port',
				message: 'expected an integer of at least 1',
				value: '0',
				keyKind: 'int',
				constraint: 'int >=1'
			},
			{
				type: 'invalid-value',
				key: 'level',
				message: "expected one of 'low', 'high'",
				value: 'mid',
				keyKind: 'enum',
				constraint: 'low|high',
				allowed: ['low', 'high']
			}
		])
	})
})

describe('usage errors from t', () => {
	it('reports a value the converter rejects with a plain Error', async () => {
		const cmd = echo({
			when: {
				description: 'd',
				type: t.custom((raw) => {
					if (Number.isNaN(Date.parse(raw))) throw new Error('not a date')
					return new Date(raw)
				})
			}
		})
		expect((await parse(cmd, 'echo --when soon')).errors).toEqual([
			{
				type: 'invalid-value',
				key: 'when',
				message: 'not a date',
				value: 'soon',
				keyKind: 'custom',
				constraint: 'value'
			}
		])
	})

	it('lets any other converter throw propagate', async () => {
		const cmd = echo({
			when: {
				description: 'd',
				type: t.custom(() => {
					throw new TypeError('bug')
				})
			}
		})
		await expect(parse(cmd, 'echo --when x')).rejects.toThrow(TypeError)
	})

	it('reports an option given no value', async () => {
		const cmd = echo({ port: { description: 'd', type: t.int() } })
		expect((await parse(cmd, 'echo --port')).errors).toEqual([
			{
				type: 'invalid-value',
				key: 'port',
				message: 'a value is required',
				value: undefined,
				keyKind: 'int',
				constraint: 'int'
			}
		])
	})

	it('reports a value-taking option that is not last in a cluster', async () => {
		const cmd = echo({
			port: { description: 'd', type: t.int(), alias: ['p'] },
			verbose: { description: 'd', type: t.boolean().optional(), alias: ['x'] }
		})
		// the zod path's errors come first, then those of the declarations with t
		expect((await parse(cmd, 'echo -px 80')).errors).toEqual([
			{ type: 'extra-arguments', name: 'echo', values: ['80'] },
			expect.objectContaining({
				type: 'invalid-value',
				key: 'p',
				message: 'takes a value, so it can only be the last option in a group'
			})
		])
	})

	it('reports a required option that is missing', async () => {
		const cmd = echo({ port: { description: 'd', type: t.int() } })
		expect((await parse(cmd, 'echo')).errors).toEqual([{ type: 'missing-argument', name: 'port' }])
	})

	it('reports the failing element of an array, by the key the caller typed', async () => {
		const cmd = echo({ port: { description: 'd', type: t.array(t.int()), alias: ['p'] } })
		expect((await parse(cmd, 'echo -p 1 --port 2 -p x')).errors).toEqual([
			{
				type: 'invalid-value',
				key: 'p',
				message: 'expected an integer',
				value: 'x',
				keyKind: 'array',
				constraint: 'int',
				index: 2
			}
		])
	})

	it('reports every value when a check on the whole array fails', async () => {
		const cmd = echo({
			tag: { description: 'd', type: t.array(t.string()).check((v) => v.length < 2 || 'at most one') }
		})
		expect((await parse(cmd, 'echo --tag a --tag b')).errors).toEqual([
			{
				type: 'invalid-value',
				key: 'tag',
				message: 'at most one',
				value: ['--tag a', '--tag b'],
				keyKind: 'array',
				constraint: 'string'
			}
		])
	})

	it('reports a flag given a value other than true or false', async () => {
		const cmd = echo({ dry: { description: 'd', type: t.boolean().optional() } })
		expect((await parse(cmd, 'echo --dry=yes')).errors).toEqual([
			{
				type: 'invalid-value',
				key: 'dry',
				message: 'expected no value, true or false',
				value: 'yes',
				keyKind: 'boolean',
				constraint: 'boolean'
			}
		])
	})

	it('reports every value of an argument when a check on the whole array fails', async () => {
		const cmd = echo({}, [
			{ name: 'ids', description: 'd', type: t.array(t.int()).check((v) => v.length < 2 || 'at most one') }
		])
		expect((await parse(cmd, 'echo 1 2')).errors).toEqual([
			{
				type: 'invalid-value',
				key: 'ids',
				message: 'at most one',
				value: ['1', '2'],
				keyKind: 'array',
				constraint: 'int'
			}
		])
	})

	it('reports a scalar given twice as expect-single with its kind', async () => {
		const cmd = echo({ port: { description: 'd', type: t.int() } })
		expect((await parse(cmd, 'echo --port 1 --port 2')).errors).toEqual([
			{ type: 'expect-single', key: 'port', keyKind: 'int', value: ['1', '2'] }
		])
	})

	it('gives an expect-single its kind string and no zod type', async () => {
		const cmd = echo({ count: { description: 'd', type: t.number() } })
		const { errors } = await parse(cmd, 'echo --count 1 --count 2')
		expect(errors).toEqual([expect.objectContaining({ type: 'expect-single', keyKind: 'number' })])
		expect(errors?.[0]).not.toHaveProperty('keyType')
	})

	it('gives an expect-single the kind of each scalar descriptor', async () => {
		const cmd = echo({
			level: { description: 'd', type: t.enum(['a', 'b']) },
			mode: { description: 'd', type: t.literal('x') },
			list: { description: 'd', type: t.array(t.enum(['a'])) },
			when: { description: 'd', type: t.custom((raw) => raw) }
		})
		const { errors } = await parse(
			cmd,
			'echo --level a --level b --mode x --mode x --list a --list a --when a --when b'
		)
		// an array takes one value per occurrence, so it is never given too many
		expect(errors?.flatMap((e) => (e.type === 'expect-single' ? [[e.key, e.keyKind]] : []))).toEqual([
			['level', 'enum'],
			['mode', 'literal'],
			['when', 'custom']
		])
	})

	it('converts a declaration with t from values given without their argv tokens', async () => {
		const cmd = echo({ port: { description: 'd', type: t.int(), alias: ['p'] } })
		const r = lookupCommand(cmd, { _: [], p: ['80'] })
		await convertDescriptors(r)
		expect(r.args.port).toBe(80)
	})

	it('reports an argument the descriptor rejects', async () => {
		const cmd = echo({}, [{ name: 'ids', description: 'd', type: t.array(t.int()) }])
		expect((await parse(cmd, 'echo 1 x')).errors).toEqual([
			{
				type: 'invalid-value',
				key: 'ids',
				message: 'expected an integer',
				value: 'x',
				keyKind: 'array',
				constraint: 'int',
				index: 1
			}
		])
		expect((await parse(cmd, 'echo 1 2')).result).toEqual({ ids: [1, 2] })
		expect((await parse(cmd, 'echo')).errors).toEqual([{ type: 'missing-argument', name: 'ids' }])
	})

	it('does not convert when only --help is asked for', async () => {
		const convert = vi.fn((raw: string) => raw)
		const cmd = echo({ x: { description: 'd', type: t.custom(convert) } })
		await parse(cmd, 'echo --x a --help')
		expect(convert).not.toHaveBeenCalled()
	})

	it('prints the errors in the caller terms', async () => {
		const cmd = command({
			name: 'echo',
			arguments: [{ name: 'id', description: 'd', type: t.int().optional() }],
			options: {
				port: { description: 'd', type: t.int({ min: 1, max: 65535 }) },
				tag: { description: 'd', type: t.array(t.enum(['a', 'b'])).optional() }
			},
			run() {}
		})
		// console output, which prints every error; the default axi output reports the top-ranked one
		const missing = await testCommand(cmd, 'echo', { output: 'console' })
		expect(missing.messages).toContain('missing required option --port')
		const { messages, exitCode } = await testCommand(cmd, 'echo x --port --tag a --tag c', {
			output: 'console'
		})
		expect(exitCode).toBe(exitCodes.usage)
		expect(messages).toContain('invalid value for argument <id>: expected an integer, received "x"')
		expect(messages).toContain('invalid value for option --port: a value is required\n')
		expect(messages).toContain(`invalid value for option --tag[1]: expected one of 'a', 'b', received "c"`)
	})
})

describe('help for t declarations', () => {
	it('shows the constraint from the introspection data', async () => {
		const cmd = command({
			name: 'serve',
			description: 'serve it',
			arguments: [
				{ name: 'root', description: 'root dir', type: t.string() },
				{ name: 'ids', description: 'ids', type: t.array(t.int({ min: 1 })).optional() }
			],
			options: {
				port: { description: 'port', type: t.int({ min: 1, max: 65535 }), default: 8080, alias: ['p'] },
				style: { description: 'style', type: t.enum(['toon', 'text', 'json']), default: 'toon' },
				release: { description: 'release', type: t.string({ pattern: /^v\d+$/ }) },
				ratio: { description: 'ratio', type: t.number({ max: 1 }).optional() },
				tag: { description: 'tag', type: t.array(t.string()).optional() },
				dry: { description: 'dry run', type: t.boolean().optional() },
				name: { description: 'name', type: t.string().optional() }
			},
			run() {}
		})
		const { messages } = await testCommand(cmd, 'serve --help --format text')
		expect(messages).toContain('Usage: test-cli serve <arguments> <options>')
		expect(messages).toContain('<root: string>')
		expect(messages).toContain('[ids: int >=1...]')
		expect(messages).toContain('[-p|--port <int 1..65535>]')
		expect(messages).toContain("[--style <toon|text|json>]   style (default 'toon')")
		expect(messages).toContain('--release <string /^v\\d+$/>')
		expect(messages).toContain('[--ratio <number <=1>]')
		expect(messages).toContain('[--tag <string>...]')
		expect(messages).toContain('[--dry]')
		expect(messages).toContain('[--name <string>]')
	})

	it('shows a literal, a json and a custom value', async () => {
		const cmd = command({
			name: 'go',
			options: {
				mode: { description: 'mode', type: t.literal('fast') },
				payload: { description: 'payload', type: t.json().optional() },
				when: { description: 'when', type: t.custom((raw) => raw).optional() },
				on: { description: 'on', type: t.literal(true) }
			},
			run() {}
		})
		const { messages } = await testCommand(cmd, 'go --help --format text')
		expect(messages).toContain('--mode <fast>')
		expect(messages).toContain('[--payload <json>]')
		expect(messages).toContain('[--when <value>]')
		expect(messages).toMatch(/^ {2}--on {2,}on$/m)
	})
})
