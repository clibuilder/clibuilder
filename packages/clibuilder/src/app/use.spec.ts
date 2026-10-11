import { mockContext } from '../drivers/context.mock.js'
import { defineKey, type Extension, type ExtensionContext } from '../index.js'
import { argv } from '../test-utils/index.js'
import { builder } from './builder.js'

function setup(contextParams?: mockContext.Params, options?: { config?: boolean | string }) {
	const context = mockContext(contextParams)
	return [builder(context, { name: 'test-cli', version: '1.0.0', ...options }), context] as const
}

function contribute(name: string, value: string): Extension {
	return ({ addCommand }) => addCommand({ name, run: () => value })
}

/** The extension `@clibuilder/plugins` returns carries this marker. */
function asPluginsExtension(extension: Extension): Extension {
	return Object.assign(extension, { [Symbol.for('clibuilder.plugins-extension')]: true })
}

describe('use()', () => {
	it('makes parse() available, as an extension may supply every command', async () => {
		const [app] = setup()
		expect(await app.use(contribute('hello', 'world')).parse(argv('test-cli hello'))).toBe('world')
	})

	it('runs the extensions in the order use() was called, each awaited before the next', async () => {
		const [app] = setup()
		const order: string[] = []
		await app
			.use(async () => {
				await new Promise((resolve) => setTimeout(resolve, 10))
				order.push('first')
			})
			.use(() => {
				order.push('second')
			})
			.default({ run() {} })
			.parse(argv('test-cli'))
		expect(order).toEqual(['first', 'second'])
	})

	it("adds the extensions' commands after the host's own commands", async () => {
		const [app, ctx] = setup()
		await app
			.use(contribute('from-extension', ''))
			.command({ name: 'from-host', run() {} })
			.parse(argv('test-cli --help'))
		const msg = ctx.sl.reporter.getLogMessage()
		expect(msg).toContain('from-extension')
		expect(msg.indexOf('from-host')).toBeLessThan(msg.indexOf('from-extension'))
	})

	it('answers a bare --version without running the extensions', async () => {
		const [app, ctx] = setup()
		const extension = vi.fn()
		await app.use(extension).parse(argv('test-cli --version'))
		expect(extension).not.toHaveBeenCalled()
		expect(ctx.stdout).toEqual('1.0.0\n')
	})

	it('answers a bare -v without waiting for an extension that never finishes', async () => {
		const [app, ctx] = setup()
		await app.use(() => new Promise(() => {})).parse(argv('test-cli -v'))
		expect(ctx.stdout).toEqual('1.0.0\n')
	})

	it('runs the extensions when --version follows a command, which needs the command tree', async () => {
		const [app] = setup()
		const extension = vi.fn(contribute('cmd', ''))
		await app.use(extension).parse(argv('test-cli cmd --version'))
		expect(extension).toHaveBeenCalledTimes(1)
	})

	it('runs the extensions before --help, which has to list their commands', async () => {
		const [app, ctx] = setup()
		await app.use(contribute('from-extension', '')).parse(argv('test-cli --help'))
		expect(ctx.sl.reporter.getLogMessage()).toContain('from-extension')
	})

	it('runs the extensions once however many times parse() is called', async () => {
		const [setupApp] = setup()
		const extension = vi.fn(contribute('hello', 'world'))
		const app = setupApp.use(extension)
		await app.parse(argv('test-cli hello'))
		await app.parse(argv('test-cli hello'))
		expect(extension).toHaveBeenCalledTimes(1)
	})

	it('propagates an error thrown by an extension to the caller of parse()', async () => {
		const [app] = setup()
		await expect(
			app
				.use(() => {
					throw new Error('broken extension')
				})
				.parse(argv('test-cli'))
		).rejects.toThrow('broken extension')
	})

	it('tells the extension which host and working directory it runs in', async () => {
		const [app, ctx] = setup()
		let received: ExtensionContext | undefined
		await app
			.use((context) => {
				received = context
			})
			.default({ run() {} })
			.parse(argv('test-cli'))
		expect(received?.host).toEqual({ name: 'test-cli', version: '1.0.0' })
		expect(received?.cwd).toBe(ctx.cwd)
	})

	it('shares the registry with the commands, through this.registry', async () => {
		const [app] = setup()
		const key = defineKey<string>('test:value')
		const result = await app
			.use(({ registry }) => {
				registry.register('my-extension', key, 'shared')
			})
			.command({
				name: 'read',
				run() {
					return this.registry.get(key)
				}
			})
			.parse(argv('test-cli read'))
		expect(result).toBe('shared')
	})

	it("logs through the framework's ui, so its messages follow --debug-cli", async () => {
		const [app, ctx] = setup()
		await app
			.use(({ ui }) => ui.debug('extension debug message'))
			.default({ run() {} })
			.parse(argv('test-cli --debug-cli'))
		expect(ctx.sl.reporter.getLogMessage()).toContain('extension debug message')
	})

	it("gives the extension a ui with every method of a command's ui", async () => {
		const [app, ctx] = setup()
		await app
			.use(({ ui }) => {
				ui.displayLevel = 'debug'
				expect(ui.displayLevel).toBe('debug')
				ui.info('extension info')
				ui.warn('extension warn')
				ui.error('extension error')
				ui.showVersion()
				ui.showHelp()
			})
			.default({ description: 'the default command', run() {} })
			.parse(argv('test-cli'))
		const msg = ctx.sl.reporter.getLogMessage()
		expect(msg).toContain('extension info')
		expect(msg).toContain('extension warn')
		expect(msg).toContain('extension error')
		expect(msg).toContain('1.0.0')
		expect(msg).toContain('Usage: test-cli')
	})

	it('reports no config source when the cli sets no config', async () => {
		const [app] = setup()
		let result: Awaited<ReturnType<ExtensionContext['resolveConfig']>> | undefined
		await app
			.use(async ({ resolveConfig }) => {
				result = await resolveConfig()
			})
			.default({ run() {} })
			.parse(argv('test-cli'))
		expect(result).toEqual({ config: undefined, source: { type: 'none' }, candidates: [] })
	})

	it("resolves the cli's config and where it came from", async () => {
		const [app] = setup({ fixtureDir: 'one-plugin' }, { config: true })
		let result: Awaited<ReturnType<ExtensionContext['resolveConfig']>> | undefined
		await app
			.use(
				asPluginsExtension(async ({ resolveConfig }) => {
					result = await resolveConfig()
				})
			)
			.default({ run() {} })
			.parse(argv('test-cli'))
		expect(result?.config).toEqual({ plugins: ['cjs-plugin'] })
		expect(result?.source).toMatchObject({ type: 'file' })
	})
})

describe('use() with the @clibuilder/plugins extension', () => {
	it('keeps loading the config plugins and the plugins group without it', async () => {
		const [app, ctx] = setup({ fixtureDir: 'one-plugin' }, { config: true })
		await app.use(() => {}).parse(argv('test-cli --help'))
		const msg = ctx.sl.reporter.getLogMessage()
		expect(msg).toContain('plugins')
		expect(msg).toContain('one')
	})

	it('skips the config-driven plugin loading, so nothing loads twice', async () => {
		const [app, ctx] = setup({ fixtureDir: 'one-plugin' }, { config: true })
		await app.use(asPluginsExtension(() => {})).parse(argv('test-cli one'))
		expect(ctx.exitCode).toBe(2)
		expect(ctx.sl.reporter.getLogMessage()).toContain('unexpected argument: one')
	})

	it('skips the automatic plugins group', async () => {
		const [app, ctx] = setup({ fixtureDir: 'one-plugin' }, { config: true })
		await app.use(asPluginsExtension(() => {})).parse(argv('test-cli plugins list'))
		expect(ctx.exitCode).toBe(2)
	})
})
