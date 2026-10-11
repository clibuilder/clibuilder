import { a } from 'assertron'
import { globalFormatOf, state } from './state.js'

it('gets name as the keywords', () => {
	const r = state({ name: 'foo', config: true, version: '1.0.0' })
	a.satisfies(r, {
		keywords: ['foo']
	})
})

it('keeps keywords if defined', () => {
	const r = state({ name: 'foo', config: true, version: '1.0.0', keywords: ['bar'] })
	a.satisfies(r, {
		keywords: ['bar']
	})
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
