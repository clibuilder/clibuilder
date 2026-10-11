import { a } from 'assertron'
import { globalFormatOf, state } from './state.js'

it('reads the config by the cli name when config is true', () => {
	const r = state({ name: 'foo', config: true, version: '1.0.0' })
	a.satisfies(r, { configName: 'foo' })
})

it('reads the config by the given name', () => {
	const r = state({ name: 'foo', config: 'bar', version: '1.0.0' })
	a.satisfies(r, { configName: 'bar' })
})

it('has no keywords: they are an option of plugins() from @clibuilder/plugins since v12', () => {
	const r = state({ name: 'foo', config: true, version: '1.0.0' })
	expect(r).not.toHaveProperty('keywords')
})

describe('globalFormatOf()', () => {
	it('is undefined in the default console output with no cli({ format })', () => {
		expect(globalFormatOf({})).toBeUndefined()
		expect(globalFormatOf({ output: 'console' })).toBeUndefined()
	})
	it('is toon under output axi', () => {
		expect(globalFormatOf({ output: 'axi' })).toBe('toon')
	})
	it('is the cli({ format }) value when it is set, in either output', () => {
		expect(globalFormatOf({ format: 'text' })).toBe('text')
		expect(globalFormatOf({ output: 'axi', format: 'json' })).toBe('json')
	})
})
