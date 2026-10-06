import { command, exitCodes as coreExitCodes, testCommand } from 'clibuilder'
import { describe, expect, it, vi } from 'vitest'
import { createOutput, exitCodes, formatOption } from './index.js'

// The option and the helper are meant to be used together inside a real command, so this suite runs
// them through clibuilder rather than calling them in isolation.
function listCommand(write: (chunk: string) => void) {
	return command({
		name: 'list',
		description: 'list plugins',
		options: { format: formatOption },
		run(args) {
			return createOutput(args.format, { stdout: { write } }).result({ plugins: ['a', 'b'] })
		}
	})
}

describe('@clibuilder/axi', () => {
	it('re-exports the exit codes from clibuilder', () => {
		expect(exitCodes).toBe(coreExitCodes)
	})

	it('writes toon when the caller passes no --format', async () => {
		const write = vi.fn()
		const { result, exitCode } = await testCommand(listCommand(write), 'list')
		expect(result).toEqual({ plugins: ['a', 'b'] })
		expect(exitCode).toBeUndefined()
		expect(write).toHaveBeenCalledWith('plugins[2]: a,b\n')
	})

	it('writes the format the caller asked for', async () => {
		const write = vi.fn()
		await testCommand(listCommand(write), 'list --format json')
		expect(write).toHaveBeenCalledWith('{"plugins":["a","b"]}\n')
	})

	it('fails with a structured error on stdout and the exit code it carries', async () => {
		const write = vi.fn()
		const show = command({
			name: 'show',
			options: { format: formatOption },
			run(args) {
				throw createOutput(args.format, { stdout: { write } }).error({
					message: 'no plugin named foo',
					code: 'not-found',
					help: 'Run `list` to see the installed plugins'
				})
			}
		})
		const { exitCode, messages } = await testCommand(show, 'show --format json')
		expect(exitCode).toBe(exitCodes.error)
		expect(write).toHaveBeenCalledWith(
			'{"error":"no plugin named foo","code":"not-found","help":["Run `list` to see the installed plugins"]}\n'
		)
		// clibuilder also logs the message as a diagnostic; the help is on stdout only.
		expect(messages).toContain('no plugin named foo')
		expect(messages).not.toContain('Run `list`')
	})

	it('rejects an unknown format as a usage error before the command runs', async () => {
		const write = vi.fn()
		const { exitCode } = await testCommand(listCommand(write), 'list --format yaml')
		expect(exitCode).toBe(exitCodes.usage)
		expect(write).not.toHaveBeenCalled()
	})
})
