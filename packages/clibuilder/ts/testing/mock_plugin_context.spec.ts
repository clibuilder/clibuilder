import { defineCollectionKey, defineKey } from '../registry.js'
import { mockPluginContext } from './mock_plugin_context.js'

it('lets plugin tests share registered capabilities and inspect contributed commands', () => {
	const capability = defineKey<string>('example:capability')
	const documents = defineCollectionKey<string>('example:documents')
	const provider = mockPluginContext({ source: 'provider' })
	const consumer = mockPluginContext({ source: 'consumer', registry: provider.registry })

	provider.context.register(capability, 'available')
	provider.context.register(documents, 'first document')
	consumer.context.addCommand({ name: 'consumer', run() {} })

	expect(consumer.context.get(capability)).toBe('available')
	expect(consumer.context.get(documents)).toEqual([{ source: 'provider', value: 'first document' }])
	expect(consumer.commands.map((command) => command.name)).toEqual(['consumer'])
})
