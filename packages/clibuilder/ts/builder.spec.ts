import { a } from 'assertron'
import { assertType, IsExtend, testType, required } from 'type-plus'
import { builder } from './builder.js'
import { mockContext } from './context.mock.js'
import { cli, command, z } from './index.js'
import { argv } from './test-utils/index.js'

function setupBuilderTest(contextParams?: mockContext.Params, options?: Partial<cli.Options>) {
	const opt = required({ name: 'test-cli', version: '1.0.0' }, options)
	const context = mockContext(contextParams)
	return [builder(context, opt), context] as const
}

it('will not have parse() if there is no `config` and have not define any command', async () => {
	const [builder] = setupBuilderTest()
	testType.equal<never, keyof typeof builder & 'parse'>(true)
	expect((builder as any).parse).toBeUndefined()
	// call parse to wait for `loadingConfig` to complete
	await builder.default({ run() {} }).parse([])
})

describe('default()', () => {
	it('adds default command for cli to run', async () => {
		const [builder] = setupBuilderTest()
		const cli = builder.default({
			run() {
				return 'hello'
			}
		})
		expect(await cli.parse(argv('test-cli'))).toEqual('hello')
	})
	it('accepts array arguments', async () => {
		const [builder] = setupBuilderTest()
		const a = await builder
			.default({
				arguments: [{ name: 'a', description: 'd', type: z.array(z.string()) }],
				run(args) {
					return args.a
				}
			})
			.parse(argv('test-cli abc def'))
		expect(a).toEqual(['abc', 'def'])
	})

	it('uses the app name in the ui', async () => {
		const [builder, ctx] = setupBuilderTest(undefined, { name: 'some-cli' })
		const cli = builder.default({
			run() {
				this.ui.info('hello')
			}
		})
		await cli.parse(argv('single-bin'))
		a.satisfies(ctx.sl.reporter.logs[0], { id: 'some-cli' })
	})
})

describe('version', () => {
	it('accepts -v to show version', async () => {
		const [builder, ctx] = setupBuilderTest()
		const cli = builder.default({ run() {} })
		await cli.parse(argv('test-cli -v'))
		expect(ctx.sl.reporter.getLogMessage()).toEqual('1.0.0')
	})
	it('accepts --version to show version', async () => {
		const [builder, ctx] = setupBuilderTest()
		const cli = builder.default({ run() {} })
		await cli.parse(argv('test-cli --version'))
		expect(ctx.sl.reporter.getLogMessage()).toEqual('1.0.0')
	})
})

describe('help', () => {
	it('accepts -h to show help', async () => {
		const [builder, ctx] = setupBuilderTest()
		const cli = builder.default({ run() {} })
		await cli.parse(argv('test-cli -h'))
		expect(ctx.sl.reporter.getLogMessage()).toEqual(getHelpMessage(cli))
	})
	it('accepts --help to show help', async () => {
		const [builder, ctx] = setupBuilderTest()
		const cli = builder.default({ run() {} })
		await cli.parse(argv('test-cli --help'))
		expect(ctx.sl.reporter.getLogMessage()).toEqual(getHelpMessage(cli))
	})
	it('shows help with description', async () => {
		const [builder, ctx] = setupBuilderTest(undefined, { description: 'some description' })
		const cli = builder.default({ run() {} })
		await cli.parse(argv('test-cli -h'))
		expect(ctx.sl.reporter.getLogMessage()).toEqual(getHelpMessageWithDescription(cli))
	})
	it('shows help if no command matches', async () => {
		const [builder, ctx] = setupBuilderTest()
		const cli = builder.default({ run() {} })
		await cli.parse(argv('test-cli not-exist'))
		expect(ctx.sl.reporter.getLogMessage()).toEqual(getHelpMessage(cli))
	})
	it('shows help if missing argument', async () => {
		const [builder, ctx] = setupBuilderTest()
		const cli = builder.default({
			arguments: [{ name: 'abc', description: 'arg abc' }],
			run() {}
		})
		await cli.parse(argv('test-cli'))
		expect(ctx.sl.reporter.getLogMessage()).toEqual(`
Usage: test-cli <arguments> [options]

Arguments:
  <abc>                  arg abc

Options:
  [-h|--help]            Print help message
  [-v|--version]         Print the CLI version
  [-V|--verbose]         Turn on verbose logging
  [--silent]             Turn off logging
  [--debug-cli]          Display clibuilder debug messages
`)
	})
	it('shows help for command', async () => {
		const [builder, ctx] = setupBuilderTest()
		const cli = builder.command({
			name: 'cmd',
			arguments: [{ name: 'abc', description: 'arg abc' }],
			run() {}
		})
		await cli.parse(argv('test-cli cmd -h'))
		expect(ctx.sl.reporter.getLogMessage()).toEqual(`
Usage: test-cli cmd <arguments>

Arguments:
  <abc>                  arg abc
`)
	})
	it('shows base help with sub command', async () => {
		const [builder, ctx] = setupBuilderTest()
		const cli = builder.command({
			name: 'cmd',
			arguments: [{ name: 'abc', description: 'arg abc' }],
			run() {}
		})
		await cli.parse(argv('test-cli'))
		expect(ctx.sl.reporter.getLogMessage()).toEqual(`
Usage: test-cli <command> [options]

Commands:
  cmd

  <command> -h           Get help for <command>

Options:
  [-h|--help]            Print help message
  [-v|--version]         Print the CLI version
  [-V|--verbose]         Turn on verbose logging
  [--silent]             Turn off logging
  [--debug-cli]          Display clibuilder debug messages
`)
	})
	it('shows help for command chain', async () => {
		const [builder, ctx] = setupBuilderTest()
		const cli = builder.command({
			name: 'sub',
			commands: [
				command({
					name: 'sub2',
					run() {}
				})
			]
		})
		await cli.parse(argv('test-cli sub sub2 -h'))
		expect(ctx.sl.reporter.getLogMessage()).toEqual(`
Usage: test-cli sub sub2
`)
	})
})

describe('--silent', () => {
	it('disables UI', async () => {
		const [builder, ctx] = setupBuilderTest()
		const cli = builder.default({
			run() {
				this.ui.info('should not print')
				this.ui.warn('should not print')
				this.ui.error('should not print')
			}
		})
		await cli.parse(argv('test-cli --silent'))
		expect(ctx.sl.reporter.getLogMessage()).toEqual('')
	})

	it('will not be passed down to command args', async () => {
		const [builder] = setupBuilderTest()
		const cli = builder.default({
			run(args) {
				testType.false<IsExtend<typeof args, { silent: any }>>(true)
				return args
			}
		})
		const args = await cli.parse(argv('test-cli --silent'))
		expect(args.silent).toBeUndefined()
	})
})

describe('verbose', () => {
	it('enables debug messages with --verbose', async () => {
		const [builder, ctx] = setupBuilderTest()
		const cli = builder.default({
			run() {
				this.ui.debug('should print')
			}
		})
		await cli.parse(argv('test-cli --verbose'))
		expect(ctx.sl.reporter.getLogMessage()).toContain('should print')
	})
	it('can be enabled with -V', async () => {
		const [builder, ctx] = setupBuilderTest()
		const cli = builder.default({
			run() {
				this.ui.debug('should print')
			}
		})
		await cli.parse(argv('test-cli -V'))
		expect(ctx.sl.reporter.getLogMessage()).toContain('should print')
	})
	it('will not be passed down to command args', async () => {
		const [builder] = setupBuilderTest()
		const cli = builder.default({
			run(args) {
				testType.false<IsExtend<typeof args, { verbose: any }>>(true)
				return args
			}
		})
		const args = await cli.parse(argv('test-cli --verbose'))
		expect(args.verbose).toBeUndefined()
	})
	it('will not be passed down to command args for -V', async () => {
		const [builder] = setupBuilderTest()
		const cli = builder.default({
			run(args) {
				testType.false<IsExtend<typeof args, { V: any }>>(true)
				return args
			}
		})
		const args = await cli.parse(argv('test-cli -V'))
		expect(args.V).toBeUndefined()
	})
})

describe('debug cli', () => {
	it('turns on cli level debug message with --debug-cli', async () => {
		const [builder, ctx] = setupBuilderTest()
		const app = builder.default({ run() {} })
		await app.parse(argv('test-cli --debug-cli'))
		expect(ctx.sl.reporter.getLogMessage()).toContain(`argv: node test-cli --debug-cli`)
	})
	it('logs when loading plugins', async () => {
		const [builder, ctx] = setupBuilderTest({ fixtureDir: 'one-plugin' }, { config: true })
		const app = builder.default({ run() {} })
		await app.parse(argv('test-cli --debug-cli'))
		const msg = ctx.sl.reporter.getLogMessage()
		expect(msg).toContain('load config from:')
		expect(msg).toContain('test-clirc.json')
		expect(msg).toContain(`activating plugin cjs-plugin`)
		expect(msg).toContain(`adding command one`)
		expect(msg).toContain(`activated plugin cjs-plugin`)
		expect(msg).toContain(`argv: node test-cli --debug-cli`)
	})
	it('logs when loading ESM plugin', async () => {
		const [builder, ctx] = setupBuilderTest(
			{ fixtureDir: 'cli-with-one-esm-plugin' },
			{ config: true }
		)
		const app = builder.default({ run() {} })
		await app.parse(argv('test-cli --debug-cli'))
		const msg = ctx.sl.reporter.getLogMessage()
		expect(msg).toContain('load config from:')
		expect(msg).toContain('test-clirc.json')
		expect(msg).toContain(`activating plugin esm-plugin`)
		expect(msg).toContain(`adding command one`)
		expect(msg).toContain(`activated plugin esm-plugin`)
		expect(msg).toContain(`argv: node test-cli --debug-cli`)
	})
	it('will not pass this flag to the command', async () => {
		const [builder] = setupBuilderTest()
		const app = builder.default({
			run(args) {
				return args
			}
		})
		const args = await app.parse(argv('test-cli --debug-cli'))
		expect(args['debug-cli']).toBeUndefined()
	})
})

describe('command()', () => {
	test('single command', async () => {
		const [builder] = setupBuilderTest()
		const cli = builder.command({
			name: 'cmd1',
			run() {
				return 'cmd1'
			}
		})
		const actual = await cli.parse(argv('single-bin cmd1'))
		expect(actual).toEqual('cmd1')
	})
	test('multiple commands', async () => {
		const [builder] = setupBuilderTest()
		const cli = builder
			.command({
				name: 'cmd1',
				run() {
					return 'cmd1'
				}
			})
			.command({
				name: 'cmd2',
				run() {
					return 'cmd2'
				}
			})
			.command({
				name: 'cmd3',
				run() {
					return 'cmd3'
				}
			})
			.command({
				name: 'cmd4',
				run() {
					return 'cmd4'
				}
			})
		const actual = await cli.parse(argv('single-bin cmd3'))
		expect(actual).toEqual('cmd3')
	})
	test('nested command', async () => {
		const [builder] = setupBuilderTest()
		const cli = builder.command({
			name: 'cmd1',
			commands: [
				{
					name: 'cmd2',
					run() {
						return 'cmd2'
					}
				}
			],
			run() {
				return 'cmd1'
			}
		})
		const actual = await cli.parse(argv('single-bin cmd1 cmd2'))
		expect(actual).toEqual('cmd2')
	})
	test('not exist nested command show help', async () => {
		const [builder, ctx] = setupBuilderTest()
		const cli = builder.command({
			name: 'cmd1',
			commands: [
				{
					name: 'cmd2',
					run() {
						return 'cmd2'
					}
				}
			]
		})
		await cli.parse(argv('single-bin cmd1 not-exist'))
		expect(ctx.sl.reporter.getLogMessage()).toContain('Usage: test-cli cmd1 <command>')
	})
	test('ui uses command name', async () => {
		const [builder, ctx] = setupBuilderTest()
		const cli = builder.command({
			name: 'cmd1',
			run() {
				this.ui.info('hello')
			}
		})
		await cli.parse(argv('single-bin cmd1'))
		const log = ctx.sl.reporter.logs.find(l => l.args.indexOf('hello') >= 0)
		a.satisfies(log, { id: 'cmd1' })
	})
})

describe('fluent syntax', () => {
	test('default() removes itself', () => {
		const [builder] = setupBuilderTest()
		const cli = builder
		const a = cli.default({ run() {} })
		testType.equal<never, keyof typeof a & 'default'>(true)
	})

	test('default() adds parse()', () => {
		const [builder] = setupBuilderTest()
		const cli = builder
		const a = cli.default({ run() {} })
		testType.equal<'parse', keyof typeof a & 'parse'>(true)
	})

	test('command() adds parse()', () => {
		const [builder] = setupBuilderTest()
		const cli = builder
		const a = cli.command({ name: 'x', run() {} })
		testType.equal<'parse', keyof typeof a & 'parse'>(true)
	})
})

describe('loadConfig()', () => {
	it('loads `{config}` including file extension', async () => {
		const ctx = mockContext({ fixtureDir: 'cli-with-extra-plugin' })
		const cli = builder(ctx, { name: 'test-cli', version: '1.0.0', config: 'alt.json' })
		const a = await cli.parse(argv('test-cli two echo hello2'))
		expect(a).toEqual('hello2')
	})
	it('loads `{config}.json`', async () => {
		const ctx = mockContext({ fixtureDir: 'cli-with-extra-plugin' })
		const cli = builder(ctx, { name: 'test-cli', version: '1.0.0', config: 'alt' })
		const a = await cli.parse(argv('test-cli two echo hello2'))
		expect(a).toEqual('hello2')
	})
	it('emits warning and exit when config fails validation', async () => {
		const ctx = mockContext({ fixtureDir: 'has-json-config' })
		await builder(ctx, { name: 'show-config', version: '1.0.0' })
			.default({
				config: z.object({
					a: z.object({ c: z.number() }),
					b: z.string()
				}),
				run() {
					fail('should not reach')
				}
			})
			.parse(argv('show-config'))

		// TODO: error message is weak in `zod`.
		// improve this when switching back to type-plus
		const msg = ctx.sl.reporter.getLogMessage()
		expect(msg).toContain(`config fails validation:
  a: Expected object, received number
  b: Required`)
		// should also print help
		expect(msg).toContain(`Usage: show-config`)
	})
	test('default() receives config type', async () => {
		const cli = builder(mockContext({ fixtureDir: 'has-config' }), {
			name: 'has-config',
			version: '1.0.0'
		}).default({
			config: z.object({ a: z.number() }),
			run() {
				assertType<{ a: number }>(this.config)
				return this.config
			}
		})
		const a = await cli.parse(argv('has-config'))
		expect(a).toEqual({ a: 1 })
	})
	test(`read config file in parent directory`, async () => {
		const ctx = mockContext({ fixtureDir: 'has-config/sub-folder' })
		const cli = builder(ctx, { name: 'has-config', version: '1.0.0' }).default({
			config: z.object({ a: z.number() }),
			run() {
				return this.config
			}
		})
		const a = await cli.parse(argv('has-config'))
		expect(a).toEqual({ a: 1 })
	})
	//   // seems to be some issue with `zod` default system
	test.skip(`default config is overridden by value in config file`, async () => {
		const ctx = mockContext({ fixtureDir: 'has-config' })
		const a = await builder(ctx, { name: 'has-config', version: '1.0.0' })
			.default({
				config: z.object({
					a: z.number().default(2),
					b: z.optional(z.number()).default(3)
				}),
				run() {
					return this.config
				}
			})
			.parse(argv('has-config'))
		expect(a).toEqual({ a: 1, b: 3 })
	})
	test('load config if default command has config', async () => {
		const ctx = mockContext({ fixtureDir: 'has-config' })
		const cli = builder(ctx, { name: 'has-config', version: '1.0.0' }).default({
			config: z.object({ a: z.number() }),
			run() {
				const cfg = this.config
				testType.equal<{ a: number }, typeof cfg>(true)
				return cfg
			}
		})

		const a = await cli.parse(argv('has-config'))
		expect(a).toEqual({ a: 1 })
	})
	test('load config if any command has config', async () => {
		const ctx = mockContext({ fixtureDir: 'has-config' })
		const cli = builder(ctx, { name: 'has-config', version: '1.0.0' }).command({
			name: 'group',
			commands: [
				{
					name: 'config',
					config: z.object({ a: z.number() }),
					run() {
						return this.config
					}
				}
			]
		})
		const a = await cli.parse(argv('has-config group config'))
		expect(a).toEqual({ a: 1 })
	})
	test('no config', async () => {
		const ctx = mockContext({ fixtureDir: 'no-config' })
		ctx.ui.displayLevel = 'debug'
		const actual = await builder(ctx, { name: 'no-config', version: '1.0.0' })
			.default({
				config: z.object({ a: z.number() }),
				run() {
					return this.config
				}
			})
			.parse(argv('single-bin'))
		const msg = ctx.sl.reporter.getLogMessage()
		expect(msg).toContain(`no config found`)
		expect(actual).toEqual(undefined)
	})
})

function getHelpMessage(app: Pick<cli.Builder, 'name' | 'description'>) {
	return `
Usage: ${app.name} [options]

Options:
  [-h|--help]            Print help message
  [-v|--version]         Print the CLI version
  [-V|--verbose]         Turn on verbose logging
  [--silent]             Turn off logging
  [--debug-cli]          Display clibuilder debug messages
`
}

function getHelpMessageWithDescription(app: Pick<cli.Builder, 'name' | 'description'>) {
	return `
Usage: ${app.name} [options]

  ${app.description}

Options:
  [-h|--help]            Print help message
  [-v|--version]         Print the CLI version
  [-V|--verbose]         Turn on verbose logging
  [--silent]             Turn off logging
  [--debug-cli]          Display clibuilder debug messages
`
}
