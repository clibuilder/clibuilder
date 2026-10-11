import { isGlobalFormatEntry } from '../builtin/base_command.js'
import { state } from './state.js'

it('has no config name: config loads through .use(config()) from clibuilder/config since v12', () => {
	const r = state({ name: 'foo', version: '1.0.0' })
	expect(r).not.toHaveProperty('configName')
})

it('has no keywords: they are an option of plugins() from @clibuilder/plugins since v12', () => {
	const r = state({ name: 'foo', version: '1.0.0' })
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
