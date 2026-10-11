import { a } from 'assertron'
import { isGlobalFormatEntry } from '../builtin/base_command.js'
import { state } from './state.js'

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

describe('the global format option', () => {
	it('is declared in either output, with no cli({ format }), defaulting to toon', () => {
		for (const output of [undefined, 'axi', 'console'] as const) {
			const entry = state({ name: 'foo', version: '1.0.0', output }).command.options!.format
			expect(isGlobalFormatEntry(entry)).toBe(true)
			expect(entry).toMatchObject({ default: 'toon' })
		}
	})
	it('defaults to the cli({ format }) value when it is set', () => {
		expect(state({ name: 'foo', version: '1.0.0', format: 'json' }).command.options!.format).toMatchObject({
			default: 'json'
		})
	})
})
