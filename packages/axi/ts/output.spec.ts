import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createOutput, encodeResult, writeDocument, writeResult } from './output.js'

const stdout = vi.spyOn(process.stdout, 'write').mockImplementation(() => true)

beforeEach(() => {
	stdout.mockClear()
})

describe('encodeResult', () => {
	it('encodes TOON, JSON, and text without writing', () => {
		expect(encodeResult({ plugins: ['a', 'b'] }, 'toon')).toBe('plugins[2]: a,b')
		expect(encodeResult({ plugins: ['a', 'b'] }, 'json')).toBe('{"plugins":["a","b"]}')
		expect(encodeResult({ plugins: ['a', 'b'] }, 'text')).toBe('plugins:\n  - a\n  - b')
		expect(stdout).not.toHaveBeenCalled()
	})
})

describe('writeResult', () => {
	it('encodes TOON, JSON, and text on stdout', () => {
		writeResult({ skills: 1 }, 'toon')
		expect(stdout).toHaveBeenCalledWith('skills: 1\n')

		writeResult({ skills: 1 }, 'json')
		expect(stdout).toHaveBeenCalledWith('{"skills":1}\n')

		writeResult({ skills: 1 }, 'text')
		expect(stdout).toHaveBeenCalledWith('skills: 1\n')

		// Nothing else reaches the stream: one call per write, so a second writer would show up here.
		expect(stdout).toHaveBeenCalledTimes(3)
	})

	it('writes to the given writer instead of stdout', () => {
		const write = vi.fn()
		writeResult({ skills: 1 }, 'json', { write })
		expect(write).toHaveBeenCalledWith('{"skills":1}\n')
		expect(stdout).not.toHaveBeenCalled()
	})
})

describe('writeDocument', () => {
	// A rule set an agent is about to follow is the answer, not a value to encode: run through TOON or
	// through the text renderer it comes back as one escaped line.
	it('writes a document verbatim, with no encoding around it', () => {
		writeDocument('# Rules\n\nState the zero.\n')

		expect(stdout).toHaveBeenCalledWith('# Rules\n\nState the zero.\n')
		expect(stdout).toHaveBeenCalledTimes(1)
	})

	it('ends the stream on a newline even when the document does not', () => {
		writeDocument('# Rules')

		expect(stdout).toHaveBeenCalledWith('# Rules\n')
	})
})

describe('createOutput', () => {
	it('falls back to toon when no format was parsed', () => {
		const output = createOutput(undefined)
		expect(output.format).toBe('toon')
		output.result({ skills: 1 })
		expect(stdout).toHaveBeenCalledWith('skills: 1\n')
	})

	it('writes a result in its format and returns it', () => {
		const report = { plugins: ['a'] }
		expect(createOutput('json').result(report)).toBe(report)
		expect(stdout).toHaveBeenCalledWith('{"plugins":["a"]}\n')
	})

	it('uses a renderer given for its format, verbatim', () => {
		const output = createOutput('text')
		output.result({ body: '# Rules' }, { text: (value) => value.body })
		expect(stdout).toHaveBeenCalledWith('# Rules\n')
	})

	it('ignores renderers given for other formats', () => {
		createOutput('json').result({ body: '# Rules' }, { text: (value) => value.body })
		expect(stdout).toHaveBeenCalledWith('{"body":"# Rules"}\n')
	})

	it('writes a document verbatim whatever the format', () => {
		createOutput('json').document('# Rules')
		expect(stdout).toHaveBeenCalledWith('# Rules\n')
	})

	it('writes to the given writer instead of stdout', () => {
		const write = vi.fn()
		const output = createOutput('toon', { stdout: { write } })
		output.result({ skills: 1 })
		output.document('# Rules')
		expect(write.mock.calls).toEqual([['skills: 1\n'], ['# Rules\n']])
		expect(stdout).not.toHaveBeenCalled()
	})
})
