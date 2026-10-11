import { defineKey } from '../plugins/registry.js'
import { mockExtensionContext } from './mock_extension_context.js'

it('captures the commands, global options and hooks an extension adds', () => {
	const { context, commands, globalOptions, beforeRunHooks } = mockExtensionContext()
	const hook = () => {}
	const answer = () => 'answer'

	context.addCommand({ name: 'cmd', run() {} })
	context.addGlobalOption('--about', { description: 'about', type: 'boolean' } as any, answer)
	context.beforeRun(hook)

	expect(commands.map((c) => c.name)).toEqual(['cmd'])
	expect(globalOptions).toEqual([{ name: '--about', entry: expect.anything(), answer }])
	expect(beforeRunHooks).toEqual([hook])
})

it('shares values and the registry, and defaults the host', () => {
	const key = defineKey<string>('example:key')
	const first = mockExtensionContext()
	const second = mockExtensionContext({ registry: first.registry })

	first.shared.set(key, 'value')
	first.context.registry.register('first', key, 'registered')

	expect(first.context.shared.get(key)).toBe('value')
	expect(second.context.registry.get(key)).toBe('registered')
	expect(second.context.host).toEqual({ name: 'test-cli', version: '1.0.0' })
})

it('resolves the given config, or none', async () => {
	expect((await mockExtensionContext().context.resolveConfig()).source).toEqual({ type: 'none' })
	const { config } = await mockExtensionContext({ config: { a: 1 } }).context.resolveConfig()
	expect(config).toEqual({ a: 1 })
})

it('captures what the extension says', () => {
	const mock = mockExtensionContext()
	mock.context.ui.info('hello')
	expect(mock.messages).toBe('hello')
})
