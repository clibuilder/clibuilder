import { isCliError } from 'clibuilder'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createOutput, encodeError, encodeResult, writeDocument, writeError, writeResult } from './output.js'

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

describe('createOutput().result with help', () => {
	it('writes the next steps after the result, counted in TOON', () => {
		createOutput('toon').result(
			{ tasks: ['a'] },
			{ help: ['Run `tasks view <id>` to see details', 'Run `tasks create`'] }
		)
		expect(stdout).toHaveBeenCalledWith(
			'tasks[1]: a\nhelp[2]: Run `tasks view <id>` to see details,Run `tasks create`\n'
		)
	})

	it('writes them as an array in JSON and as bullets in text', () => {
		createOutput('json').result({ done: true }, { help: 'Run `next`' })
		expect(stdout).toHaveBeenCalledWith('{"done":true,"help":["Run `next`"]}\n')
		createOutput('text').result({ done: true }, { help: 'Run `next`' })
		expect(stdout).toHaveBeenCalledWith('done: true\n\nhelp:\n  - Run `next`\n')
	})

	it('returns the value without the suggestions', () => {
		const value = { done: true }
		expect(createOutput('toon').result(value, { help: 'Run `next`' })).toBe(value)
	})

	it('leaves the key out when there is nothing to suggest', () => {
		createOutput('toon').result({ done: true }, { help: [] })
		expect(stdout).toHaveBeenCalledWith('done: true\n')
	})

	it('follows a renderer with the suggestions in the same format', () => {
		createOutput('text').result({ body: '# Rules' }, { text: (v) => v.body, help: 'Run `next`' })
		expect(stdout).toHaveBeenCalledWith('# Rules\n\nhelp:\n  - Run `next`\n')
		createOutput('text').result({ body: '# Rules\n' }, { text: (v) => v.body, help: 'Run `next`' })
		expect(stdout).toHaveBeenCalledWith('# Rules\n\nhelp:\n  - Run `next`\n')
	})
})

describe('encodeError', () => {
	const report = {
		message: 'no plugin named foo',
		code: 'not-found',
		details: { candidates: ['foo-a', 'foo-b'] },
		help: 'Run `my-cli list` to see the installed plugins'
	}

	it('writes error, code, details, then help, flat in every format', () => {
		expect(encodeError(report, 'toon')).toBe(
			[
				'error: no plugin named foo',
				'code: not-found',
				'candidates[2]: foo-a,foo-b',
				'help[1]: Run `my-cli list` to see the installed plugins'
			].join('\n')
		)
		expect(JSON.parse(encodeError(report, 'json'))).toEqual({
			error: 'no plugin named foo',
			code: 'not-found',
			candidates: ['foo-a', 'foo-b'],
			help: ['Run `my-cli list` to see the installed plugins']
		})
		expect(encodeError({ message: 'boom', code: 'failed' }, 'text')).toBe('error: boom\ncode: failed')
	})
})

describe('writeError', () => {
	it('writes on stdout, not stderr, and returns exit code 1 by default', () => {
		const stderr = vi.spyOn(process.stderr, 'write').mockImplementation(() => true)
		expect(writeError({ message: 'boom', code: 'failed' }, 'toon')).toBe(1)
		expect(stdout).toHaveBeenCalledWith('error: boom\ncode: failed\n')
		expect(stderr).not.toHaveBeenCalled()
		stderr.mockRestore()
	})

	it('returns the exit code it is given', () => {
		const write = vi.fn()
		expect(writeError({ message: 'bad', code: 'usage', exitCode: 2 }, 'json', { write })).toBe(2)
		expect(write).toHaveBeenCalledWith('{"error":"bad","code":"usage"}\n')
	})
})

describe('createOutput().error', () => {
	it('writes the error in its format and returns a CliError to throw', () => {
		const error = createOutput('json').error({ message: 'boom', code: 'failed' })
		expect(stdout).toHaveBeenCalledWith('{"error":"boom","code":"failed"}\n')
		expect(isCliError(error)).toBe(true)
		expect(error.message).toBe('boom')
		expect(error.exitCode).toBe(1)
		expect(error.help).toEqual([])
	})

	it('carries a usage exit code', () => {
		expect(createOutput('toon').error({ message: 'bad', code: 'usage', exitCode: 2 }).exitCode).toBe(2)
	})
})
