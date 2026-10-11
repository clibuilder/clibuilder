import { testType } from 'type-plus/testing'
import * as v from 'valibot'
import { z } from 'zod'
import { z as z4 } from 'zod4'
import { configExtension } from '../config/extension.js'
import { mockContext } from '../drivers/context.mock.js'
import { type cli, command, exitCodes, type StandardSchemaV1 } from '../index.js'
import { generateHelpMessage } from '../render/help.js'
import { argv } from '../test-utils/index.js'
import { builder } from './builder.js'

/**
 * Runs `cmd` as the default command with `config` as the loaded config,
 * and returns what `run()` returned, the log and the exit code.
 *
 * It runs in `output: 'console'`, whose prose report lists every key's messages;
 * the coded report of the default `axi` output is specified in `usage_error_report.spec.ts`.
 */
async function runWithConfig(cmd: cli.Command.DefaultCommand<any, any, any>, config: unknown) {
	const ctx = mockContext({ output: 'console' })
	const result = await builder(ctx, { name: 'app', version: '1.0.0', output: 'console' })
		.use(configExtension(async () => ({ config, source: { type: 'none' }, candidates: [] }), { showConfig: true }))
		.default(cmd)
		.parse(argv('app'))
	return { result, messages: ctx.messages, exitCode: ctx.exitCode }
}

describe('config from a zod 3 schema', () => {
	it('gets the schema output, so defaults apply (regression: the input was stored)', async () => {
		const { result } = await runWithConfig(
			{
				config: z.object({ a: z.number(), b: z.number().default(3) }),
				run() {
					return this.config
				}
			},
			{ a: 1 }
		)
		expect(result).toEqual({ a: 1, b: 3 })
	})

	it('gets the schema output, so transforms apply (regression: the input was stored)', async () => {
		const { result } = await runWithConfig(
			{
				config: z.object({ name: z.string().transform((s) => s.toUpperCase()) }),
				run() {
					return this.config
				}
			},
			{ name: 'app' }
		)
		expect(result).toEqual({ name: 'APP' })
	})

	it('reports an invalid config as before', async () => {
		const { messages, exitCode } = await runWithConfig(
			{
				config: z.object({ a: z.number() }),
				run() {
					expect.fail('should not run')
				}
			},
			{ a: 'x' }
		)
		expect(messages).toContain(`config fails validation:
  a: Expected number, received string`)
		expect(messages).toContain('Usage: app')
		expect(exitCode).toBe(exitCodes.error)
	})
})

describe('config from a zod 4 schema', () => {
	const config = z4.object({
		name: z4.string().transform((s) => s.toUpperCase()),
		port: z4.number().default(8080),
		tags: z4.array(z4.string()).optional()
	})

	it('gets the schema output, with defaults and transforms applied', async () => {
		const { result } = await runWithConfig(
			{
				config,
				run() {
					return this.config
				}
			},
			{ name: 'app' }
		)
		expect(result).toEqual({ name: 'APP', port: 8080 })
	})

	it('types this.config from the schema output', () => {
		command({
			name: 'cmd',
			config,
			run() {
				testType.equal<typeof this.config, { name: string; port: number; tags?: string[] | undefined }>(true)
			}
		})
	})

	it('maps the issues into the config validation error, keyed by path', async () => {
		const { messages, exitCode, result } = await runWithConfig(
			{
				config: z4.object({ a: z4.object({ c: z4.number() }), b: z4.string() }),
				run() {
					expect.fail('should not run')
				}
			},
			{ a: { c: 'x' } }
		)
		expect(messages).toContain(`config fails validation:
  a.c: Invalid input: expected number, received string
  b: Invalid input: expected string, received undefined`)
		expect(messages).toContain('Usage: app')
		expect(exitCode).toBe(exitCodes.error)
		expect(result).toBe(exitCodes.error)
	})
})

describe('config from a valibot schema', () => {
	const config = v.object({
		name: v.pipe(
			v.string(),
			v.transform((s) => s.toUpperCase())
		),
		port: v.optional(v.number(), 8080)
	})

	it('gets the schema output, with defaults and transforms applied', async () => {
		const { result } = await runWithConfig(
			{
				config,
				run() {
					return this.config
				}
			},
			{ name: 'app' }
		)
		expect(result).toEqual({ name: 'APP', port: 8080 })
	})

	it('types this.config from the schema output', () => {
		command({
			name: 'cmd',
			config,
			run() {
				testType.equal<typeof this.config, { name: string; port: number }>(true)
			}
		})
	})

	it('maps the issues into the config validation error, keyed by path', async () => {
		const { messages, exitCode } = await runWithConfig(
			{
				config,
				run() {
					expect.fail('should not run')
				}
			},
			{ name: 1, port: 'x' }
		)
		expect(messages).toContain(`config fails validation:
  name: Invalid type: Expected string but received 1
  port: Invalid type: Expected number but received "x"`)
		expect(exitCode).toBe(exitCodes.error)
	})

	it('can be placed among a group of commands', () => {
		const cmd = command({ name: 'cmd', config, run() {} })
		testType.canAssign<typeof cmd, cli.Command>(true)
	})
})

describe('config from any Standard Schema', () => {
	/**
	 * A hand-written Standard Schema, standing in for a vendor clibuilder does not know.
	 */
	function schema<Out>(
		validate: StandardSchemaV1<unknown, Out>['~standard']['validate']
	): StandardSchemaV1<unknown, Out> {
		return { '~standard': { version: 1, vendor: 'test', validate } }
	}

	it('awaits an async validate and gets its output', async () => {
		const { result } = await runWithConfig(
			{
				config: schema(async (value) => ({ value: { ...(value as object), checked: true } })),
				run() {
					return this.config
				}
			},
			{ a: 1 }
		)
		expect(result).toEqual({ a: 1, checked: true })
	})

	it('reports the issues of an async validate', async () => {
		const { messages, exitCode } = await runWithConfig(
			{
				config: schema(async () => ({ issues: [{ message: 'is not allowed', path: ['a'] }] })),
				run() {
					expect.fail('should not run')
				}
			},
			{ a: 1 }
		)
		expect(messages).toContain(`config fails validation:
  a: is not allowed`)
		expect(exitCode).toBe(exitCodes.error)
	})

	it('groups the messages of one key, reads path segments, and keys an issue without a path as (config)', async () => {
		const { messages } = await runWithConfig(
			{
				config: schema(() => ({
					issues: [
						{ message: 'too short', path: [{ key: 'list' }, 0] },
						{ message: 'not a word', path: ['list', { key: 0 }] },
						{ message: 'is empty' },
						{ message: 'is empty too', path: [] }
					]
				})),
				run() {
					expect.fail('should not run')
				}
			},
			{}
		)
		expect(messages).toContain(`config fails validation:
  list.0: too short,not a word
  (config): is empty,is empty too`)
	})

	it('types this.config from the schema output', () => {
		command({
			name: 'cmd',
			config: schema(() => ({ value: { a: 1 } })),
			run() {
				testType.equal<typeof this.config, { a: number }>(true)
			}
		})
	})
})

describe('help Config section', () => {
	function help(config: cli.ConfigSchema) {
		return generateHelpMessage('app', { name: 'cmd', config, run() {} } as any)
	}

	it('omits the section for a zod 3 config, which has no JSON Schema', () => {
		expect(help(z.object({ a: z.string(), b: z.optional(z.array(z.number())) }))).not.toContain('Config:')
	})

	it('renders a zod 4 config from its JSON Schema, in the form a config file is written', () => {
		expect(
			help(
				z4.object({
					name: z4.string(),
					port: z4.number().int().default(8080),
					mode: z4.enum(['fast', 'thorough']),
					list: z4.array(z4.object({ d: z4.string().optional() })).optional(),
					tags: z4.array(z4.string()),
					any: z4.unknown(),
					flag: z4.union([z4.boolean(), z4.literal('auto')]),
					nothing: z4.null(),
					empty: z4.object({})
				})
			)
		).toContain(`Config:
{ name: string, port?: number, mode: "fast" | "thorough", list?: Array<{ d?: string }>, tags: string[], any: unknown, flag: boolean | "auto", nothing: null, empty: {} }`)
	})

	it('omits the section when the schema exposes no JSON Schema', () => {
		expect(help(v.object({ a: v.string() }))).not.toContain('Config:')
	})

	it('omits the section when the JSON Schema conversion throws', () => {
		const config = {
			'~standard': {
				version: 1,
				vendor: 'test',
				validate: (value: unknown) => ({ value }),
				jsonSchema: {
					input() {
						throw new Error('not supported')
					},
					output() {
						throw new Error('not supported')
					}
				}
			}
		} as StandardSchemaV1
		expect(help(config)).not.toContain('Config:')
	})
})
