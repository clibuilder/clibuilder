import { createRegistry, defineCollectionKey, defineKey } from './registry.js'

describe('registry', () => {
	it('returns the first value registered for a value key', () => {
		const key = defineKey<string>('example:port')
		const registry = createRegistry()

		registry.register('first-plugin', key, 'first')
		registry.register('second-plugin', key, 'second')

		expect(registry.get(key)).toBe('first')
		expect(registry.describe(key)).toEqual(['first-plugin'])
	})

	it('keeps collection contributions in registration order with their sources', () => {
		const key = defineCollectionKey<string>('example:content')
		const registry = createRegistry()

		registry.register('first-plugin', key, 'first')
		registry.register('second-plugin', key, 'second')

		expect(registry.get(key)).toEqual([
			{ source: 'first-plugin', value: 'first' },
			{ source: 'second-plugin', value: 'second' }
		])
	})

	it('matches independently-defined keys by their string identity', () => {
		const providerKey = defineKey<string>('example:port')
		const consumerKey = defineKey<string>('example:port')
		const registry = createRegistry()

		registry.register('provider-plugin', providerKey, 'provided')

		expect(registry.get(consumerKey)).toBe('provided')
	})
})
