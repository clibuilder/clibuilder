import { cli, command, exitCodes as coreExitCodes, testCommand } from 'clibuilder'
import * as core from 'clibuilder/axi'
import { describe, expect, it, vi } from 'vitest'
import * as axi from './index.js'
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

	it('re-exports the value helpers from clibuilder/axi', () => {
		expect(axi.collapseHome).toBe(core.collapseHome)
		expect(axi.defaultTextLimit).toBe(core.defaultTextLimit)
		expect(axi.fullOption).toBe(core.fullOption)
		expect(axi.homeHeader).toBe(core.homeHeader)
		expect(axi.orEmpty).toBe(core.orEmpty)
		expect(axi.truncateList).toBe(core.truncateList)
		expect(axi.truncateText).toBe(core.truncateText)
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
		// the error is reported once, on stdout: clibuilder logs nothing more for it.
		expect(messages).not.toContain('no plugin named foo')
		expect(messages).not.toContain('Run `list`')
	})

	it('rejects an unknown format as a usage error before the command runs', async () => {
		const write = vi.fn()
		const { exitCode } = await testCommand(listCommand(write), 'list --format yaml')
		expect(exitCode).toBe(exitCodes.usage)
		expect(write).not.toHaveBeenCalled()
	})

	// clibuilder's global `--format` is active under `output: 'axi'` or `cli({ format })`, and a command's own
	// `format` option conflicts with it. The migration is to delete the local option and read `this.format`.
	it('conflicts with the global --format of clibuilder under output axi', () => {
		const app = cli({ name: 'app', version: '1.0.0', output: 'axi' })
		expect(() => app.command(listCommand(vi.fn()))).toThrow(/declares its own option 'format'/)
	})

	it('keeps working in the default console output of clibuilder', () => {
		const app = cli({ name: 'app', version: '1.0.0' })
		expect(() => app.command(listCommand(vi.fn()))).not.toThrow()
	})
})
