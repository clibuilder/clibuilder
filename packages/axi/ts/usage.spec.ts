import { command, exitCodes, testCommand, z } from 'clibuilder'
import { describe, expect, it, vi } from 'vitest'
import { formatOption } from './format.js'
import { createUsageErrorHandler, describeUsageError } from './usage.js'

function listCommand(write: (chunk: string) => void, format?: 'json') {
	return command({
		name: 'list',
		description: 'list tasks',
		arguments: [{ name: 'repo', description: 'the repo', type: z.string() }],
		options: { format: formatOption, state: { type: z.optional(z.string()), description: 'the state' } },
		onUsageError: createUsageErrorHandler({ format, stdout: { write } }),
		run() {
			return 'ran'
		}
	})
}

describe('createUsageErrorHandler', () => {
	it('writes an unknown option as a structured error on stdout, listing the valid ones, exit 2', async () => {
		const write = vi.fn()
		const { result, exitCode, messages } = await testCommand(listCommand(write), 'list repo --stat open')
		expect(exitCode).toBe(exitCodes.usage)
		expect(result).toBe(exitCodes.usage)
		expect(write.mock.calls).toEqual([
			[
				[
					'error: unknown option --stat',
					'code: unknown-option',
					'help[1]: "valid options for `list`: --format, --state (--help always allowed)"',
					''
				].join('\n')
			]
		])
		// Nothing else is said: no error lines and no help dump on stderr.
		expect(messages).toBe('exit with 2')
	})

	it('names the arguments a missing one belongs to', async () => {
		const write = vi.fn()
		await testCommand(listCommand(write), 'list')
		expect(write).toHaveBeenCalledWith(
			['error: missing required argument <repo>', 'code: missing-argument', 'help[1]: "`list` takes: <repo>"', ''].join(
				'\n'
			)
		)
	})

	it('writes in the format it is given', async () => {
		const write = vi.fn()
		await testCommand(listCommand(write, 'json'), 'list repo --stat open')
		expect(JSON.parse(write.mock.calls[0]?.[0])).toEqual({
			error: 'unknown option --stat',
			code: 'unknown-option',
			help: ['valid options for `list`: --format, --state (--help always allowed)']
		})
	})

	it('reports several errors as one, led by the unknown option', async () => {
		const write = vi.fn()
		await testCommand(listCommand(write, 'json'), 'list --stat open')
		const report = JSON.parse(write.mock.calls[0]?.[0])
		expect(report.code).toBe('unknown-option')
		expect(report.error).toBe('unknown option --stat; missing required argument <repo>')
		expect(report.help).toHaveLength(2)
	})
})

describe('describeUsageError', () => {
	const cmd = command({
		name: 'show',
		arguments: [{ name: 'id', description: 'the id', type: z.optional(z.number()) }],
		run() {}
	})

	it('codes every kind of usage error', () => {
		expect(describeUsageError({ type: 'invalid-key', key: 'x' }, cmd)).toEqual({
			code: 'unknown-option',
			message: 'unknown option -x',
			help: ['`show` takes no options (--help always allowed)']
		})
		expect(describeUsageError({ type: 'extra-arguments', name: 'id', values: ['a', 'b'] }, cmd)).toEqual({
			code: 'unexpected-argument',
			message: 'unexpected arguments: a, b',
			help: ['`show` takes: [id]']
		})
		expect(
			describeUsageError({ type: 'invalid-value', key: 'id', message: 'expected number', value: 'a' }, cmd)
		).toEqual({
			code: 'invalid-value',
			message: 'invalid value for argument <id>: expected number, received "a"',
			help: []
		})
		expect(describeUsageError({ type: 'conflicting-options', key: 'full', conflictsWith: 'n' }, cmd)).toEqual({
			code: 'conflicting-options',
			message: 'option --full cannot be used with option -n',
			help: []
		})
		expect(
			describeUsageError({ type: 'expect-single', key: 'limit', keyType: z.number(), value: [1, 2] }, cmd)
		).toEqual({
			code: 'expect-single',
			message: 'option --limit expects a single value, received: 1, 2',
			help: []
		})
	})

	it('says when a command takes no arguments', () => {
		const bare = command({ name: 'bare', run() {} })
		expect(describeUsageError({ type: 'extra-arguments', name: '', values: ['a'] }, bare).help).toEqual([
			'`bare` takes no arguments'
		])
	})
})
