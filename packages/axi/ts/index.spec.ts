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

	it('rejects an unknown format as a usage error before the command runs', async () => {
		const write = vi.fn()
		const { exitCode } = await testCommand(listCommand(write), 'list --format yaml')
		expect(exitCode).toBe(exitCodes.usage)
		expect(write).not.toHaveBeenCalled()
	})
})
