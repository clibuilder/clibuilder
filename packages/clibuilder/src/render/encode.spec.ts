import { encode, errorOutput } from './encode.js'

describe('encode()', () => {
	const value = { name: 'foo', tags: ['a', 'b'] }
	it('encodes toon with the official encoder', () => {
		expect(encode(value, 'toon')).toBe('name: foo\ntags[2]: a,b')
	})
	it('encodes json as JSON.stringify', () => {
		expect(encode(value, 'json')).toBe(JSON.stringify(value))
	})
	it('encodes text as key: value lines', () => {
		expect(encode(value, 'text')).toBe('name: foo\n\ntags:\n  - a\n  - b')
	})
})

describe('errorOutput()', () => {
	it('lays out error, code, the details, then help', () => {
		const output = errorOutput({ message: 'm', code: 'c', details: { a: 1 }, help: ['h'] })
		expect(Object.keys(output)).toEqual(['error', 'code', 'a', 'help'])
		expect(output).toEqual({ error: 'm', code: 'c', a: 1, help: ['h'] })
	})
	it('leaves out an empty help', () => {
		expect(errorOutput({ message: 'm', code: 'c', help: [] })).toEqual({ error: 'm', code: 'c' })
	})
})
