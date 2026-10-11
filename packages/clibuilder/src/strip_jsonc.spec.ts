import { describe, expect, it } from 'vitest'
import { stripJsonc } from './strip_jsonc.js'

const parse = (text: string) => JSON.parse(stripJsonc(text))

describe(stripJsonc.name, () => {
	it('strips line and block comments', () => {
		expect(parse('{\n// a\n"a": 1, /* b */ "b": 2 }')).toEqual({ a: 1, b: 2 })
	})
	it('keeps `//` and `/*` inside strings', () => {
		expect(parse('{"a":"https://x","b":"a/*b"}')).toEqual({ a: 'https://x', b: 'a/*b' })
	})
	it('handles escaped quotes and backslashes', () => {
		expect(parse(String.raw`{"a":"a\"//b","c":"c:\\"} // end`)).toEqual({ a: 'a"//b', c: 'c:\\' })
	})
	it('drops trailing commas in objects and arrays', () => {
		expect(parse('{"a":[1,2,],}')).toEqual({ a: [1, 2] })
	})
	it('drops a trailing comma followed by a comment', () => {
		expect(parse('{"a":1, // x\n /* y */ }')).toEqual({ a: 1 })
		expect(parse('[1, /* y */ ]')).toEqual([1])
	})
	it('keeps commas inside strings and between values', () => {
		expect(parse('{"a":",}","b":[1,2]}')).toEqual({ a: ',}', b: [1, 2] })
	})
	it('strips a leading BOM', () => {
		expect(parse('\uFEFF{"a":1}')).toEqual({ a: 1 })
	})
	it('throws on an unterminated block comment', () => {
		expect(() => stripJsonc('{"a":1} /* oops')).toThrow(/Unterminated block comment/)
	})
	it('throws on an unterminated string', () => {
		expect(() => stripJsonc('{"a":"oops')).toThrow(/Unterminated string/)
	})
	it('keeps the length and the offsets of everything else', () => {
		const text = '\uFEFF{ /* c */ "a": 1, // x\n}'
		const out = stripJsonc(text)
		expect(out).toHaveLength(text.length)
		expect(out.indexOf('"a"')).toBe(text.indexOf('"a"'))
		expect(out.indexOf('\n')).toBe(text.indexOf('\n'))
	})
	it('leaves JS and YAML for JSON.parse to reject', () => {
		expect(() => parse('export default { a: 1 }')).toThrow()
		expect(() => parse('- a\n- b')).toThrow()
	})
})
