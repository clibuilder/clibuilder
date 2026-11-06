import { decode, encode as encodeWithOfficial } from '@toon-format/toon'
import { empty, printAnswer, result } from './answer.js'
import { encode, errorOutput } from './encode.js'
import { ref } from './ref.js'

describe('encode()', () => {
	const value = { name: 'foo', tags: ['a', 'b'] }
	it('encodes toon as key: value lines and an inline array', () => {
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

describe('encode() of a table', () => {
	const value = {
		plugins: [
			{ name: 'a', version: '1.0.0' },
			{ name: 'b', version: '2.0.0' }
		]
	}
	it('encodes toon as a tabular array', () => {
		expect(encode(value, 'toon')).toBe('plugins[2]{name,version}:\n  a,1.0.0\n  b,2.0.0')
	})
	it('encodes json as JSON.stringify', () => {
		expect(encode(value, 'json')).toBe('{"plugins":[{"name":"a","version":"1.0.0"},{"name":"b","version":"2.0.0"}]}')
	})
	it('encodes text as an aligned table under its key', () => {
		expect(encode(value, 'text')).toBe('plugins:\n  name  version\n  a     1.0.0\n  b     2.0.0')
	})
	it('encodes an empty list in each format', () => {
		expect(encode({ plugins: [] }, 'toon')).toBe('plugins: []')
		expect(encode({ plugins: [] }, 'json')).toBe('{"plugins":[]}')
		expect(encode({ plugins: [] }, 'text')).toBe('plugins: (none)')
	})
})

// change 1 of the AXI conventions: TOON only for collections, plain `key: value` lines for the rest
describe('encode() toon of a single object', () => {
	it('writes a string field unquoted, where the official encoder quotes it', () => {
		const task = { id: 7, title: 'Fix: the parser', labels: 'bug, p1', owner: '--me', note: '[draft] {wip} # - x' }
		expect(encode(task, 'toon')).toBe(
			['id: 7', 'title: Fix: the parser', 'labels: bug, p1', 'owner: --me', 'note: [draft] {wip} # - x'].join('\n')
		)
	})
	it('writes a backslash and an inner quote as they are', () => {
		expect(encode({ path: 'C:\\tmp', say: 'say "hi"' }, 'toon')).toBe('path: C:\\tmp\nsay: say "hi"')
	})
	it('writes null, a boolean and a number as toon literals', () => {
		expect(encode({ a: null, b: true, c: 1.5 }, 'toon')).toBe('a: null\nb: true\nc: 1.5')
	})
	it('writes a date as its ISO string, unquoted', () => {
		expect(encode({ at: new Date(0) }, 'toon')).toBe('at: 1970-01-01T00:00:00.000Z')
	})
	it.each([
		['the empty string', '', 'k: ""'],
		['a leading space', ' x', 'k: " x"'],
		['a trailing space', 'x ', 'k: "x "'],
		['a newline', 'a\nb', 'k: "a\\nb"'],
		['a carriage return', 'a\rb', 'k: "a\\rb"'],
		['a tab', 'a\tb', 'k: "a\\tb"'],
		['a leading quote', '"x" y', 'k: "\\"x\\" y"'],
		['a leading #', '#1', 'k: "#1"'],
		['true', 'true', 'k: "true"'],
		['null', 'null', 'k: "null"'],
		['a number', '42', 'k: "42"'],
		['a number the decoder reads as a string', '05', 'k: "05"'],
		['an empty array', '[]', 'k: "[]"']
	])('quotes %s, which a toon decoder would not read back as is', (_, value, expected) => {
		expect(encode({ k: value }, 'toon')).toBe(expected)
	})
	it('quotes a key the official encoder quotes', () => {
		expect(encode({ 'a b': 'c: d' }, 'toon')).toBe('"a b": c: d')
	})
	it('nests an object as indented key: value lines', () => {
		expect(encode({ task: { title: 'a: b', owner: { name: 'x, y' } } }, 'toon')).toBe(
			'task:\n  title: a: b\n  owner:\n    name: x, y'
		)
	})
	it('encodes an array inside a single object as toon, quoting its items', () => {
		expect(encode({ title: 'a: b', tags: ['c: d', 'e'] }, 'toon')).toBe('title: a: b\ntags[2]: "c: d",e')
	})
})

describe('encode() toon of a collection', () => {
	it('keeps the official tabular form, quoting a cell', () => {
		expect(encode({ tasks: [{ id: 1, title: 'a: b' }] }, 'toon')).toBe('tasks[1]{id,title}:\n  1,"a: b"')
	})
	it('keeps the official list form, objects in it included', () => {
		const value = { items: [{ a: 'x: y', b: { c: 'd: e' } }, 'f, g'] }
		expect(encode(value, 'toon')).toBe(encodeWithOfficial(value))
	})
	it('writes the scalar fields beside a collection as plain lines', () => {
		expect(encode({ count: '1 of 2: open', tasks: [{ id: 1 }] }, 'toon')).toBe(
			'count: 1 of 2: open\ntasks[1]{id}:\n  1'
		)
	})
	it('encodes a top-level array with the official encoder', () => {
		expect(encode(['a: b'], 'toon')).toBe('[1]: "a: b"')
	})
})

describe('encode() toon reads back with a toon decoder', () => {
	const pieces = ['a', ' ', ': ', ',', '"', '\\', '-', '#', '[', ']', '{', '}', '|', '\n', '\t', '1', '.', 'e', 'true', 'null', '[]']
	// a fixed seed, so a failure reproduces
	let seed = 1
	const next = () => {
		seed = (seed * 48271) % 2147483647
		return seed
	}
	const strings = Array.from({ length: 2000 }, () =>
		Array.from({ length: next() % 6 }, () => pieces[next() % pieces.length]).join('')
	)
	it('in strict mode, for any string field', () => {
		for (const s of strings) {
			const value = { k: s, nested: { k: s }, list: [s], rows: [{ k: s }], z: 1 }
			expect(decode(encode(value, 'toon'), { strict: true })).toEqual(value)
		}
	})
	it('for an error', () => {
		const value = errorOutput({
			message: "invalid value for option --p: expected one of 'a', 'b', received \"c\"",
			code: 'invalid-value',
			details: { option: '--p', value: 'c' },
			help: ['Usage: app show <arguments>', 'allowed for --p: a, b']
		})
		expect(decode(encode(value, 'toon'))).toEqual(value)
	})
})

describe('printAnswer() toon of a single object', () => {
	const resolve = (r: { path: string }) => `app ${r.path}`
	it('writes the fields as plain lines, then help[N]', () => {
		const answer = result({ id: 1, title: 'Fix: the parser' }, { help: ['Run `app task close 1`: close it'] })
		expect(printAnswer(answer, 'toon', { resolve })).toBe(
			'id: 1\ntitle: Fix: the parser\nhelp[1]: "Run `app task close 1`: close it"\n'
		)
	})
	it('writes next[N]{run,why} as a toon table', () => {
		const answer = result({ title: 'a: b' }, { help: ref('task get', {}, 'see: it') })
		expect(printAnswer(answer, 'toon', { resolve, refs: 'next' })).toBe(
			'title: a: b\nnext[1]{run,why}:\n  app task get,"see: it"\n'
		)
	})
	it('writes an empty state as a plain line', () => {
		expect(printAnswer(empty('0 tasks: none open'), 'toon')).toBe('empty: 0 tasks: none open\n')
	})
	it('writes a scalar under result as a plain line', () => {
		expect(printAnswer('done: 1' as unknown, 'toon')).toBe('done: 1\n')
		expect(printAnswer(result(42), 'toon')).toBe('result: 42\n')
	})
})

describe('encode() toon of an error', () => {
	it('writes error, code and the details as plain lines, and help as a toon array', () => {
		const value = errorOutput({
			message: 'unknown option --bogus: did you mean --bog?',
			code: 'unknown-option',
			details: { option: '--bogus', allowed: ['--bog', '--full'] },
			help: ['Usage: app show [options]']
		})
		expect(encode(value, 'toon')).toBe(
			[
				'error: unknown option --bogus: did you mean --bog?',
				'code: unknown-option',
				'option: --bogus',
				'allowed[2]: "--bog","--full"',
				'help[1]: "Usage: app show [options]"'
			].join('\n')
		)
	})
})
