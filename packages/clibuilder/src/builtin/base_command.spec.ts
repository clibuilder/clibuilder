import { command } from '../command/define.js'
import { formatOption } from '../render/format.js'
import { getBaseCommand, isGlobalFormatEntry, yieldToGlobalFormat } from './base_command.js'

describe('getBaseCommand', () => {
	it('declares no run of its own, so a bare application is a group (#609)', () => {
		expect(getBaseCommand('')).not.toHaveProperty('run')
	})
})

describe('getBaseCommand() with a format', () => {
	it('declares no format option without one, as in clibuilder 11.5', () => {
		expect(getBaseCommand('').options).not.toHaveProperty('format')
	})
	it('declares the global format option, defaulting to the given format, with no -f alias', () => {
		const entry = getBaseCommand('', { format: 'json' }).options!.format!
		expect(entry).toMatchObject({ default: 'json' })
		expect(entry).not.toHaveProperty('alias')
		expect(isGlobalFormatEntry(entry)).toBe(true)
		expect((entry.type as any).safeParse('yaml').success).toBe(false)
	})
})

describe('yieldToGlobalFormat()', () => {
	it('keeps a command without a format option as is', () => {
		const cmd = command({ name: 'show', options: { all: { description: 'all' } }, run() {} })
		expect(yieldToGlobalFormat(cmd)).toBe(cmd)
	})
	it('keeps the base command carrying the global format as is', () => {
		const base = getBaseCommand('', { format: 'toon' })
		expect(yieldToGlobalFormat(base)).toBe(base)
	})
	it('drops a format option that defers to the global one, on a copy', () => {
		const cmd = command({ name: 'list', options: { format: formatOption, all: { description: 'all' } }, run() {} })
		const yielded = yieldToGlobalFormat(cmd)
		expect(Object.keys(yielded.options!)).toEqual(['all'])
		expect(Object.keys(cmd.options!)).toEqual(['format', 'all'])
	})
	it('throws for any other format option, pointing at the RFC and the migration', () => {
		const cmd = command({ name: 'show', options: { format: { description: 'local' } }, run() {} })
		expect(() => yieldToGlobalFormat(cmd)).toThrow(
			"command 'show' declares its own option 'format', which conflicts with the global --format option. " +
				'Delete the local declaration and read this.format in run() instead. See docs/rfcs/axi-native.md section 3.4'
		)
	})
	it('throws for an option aliased format', () => {
		const cmd = command({ name: 'show', options: { output: { description: 'local', alias: ['format'] } }, run() {} })
		expect(() => yieldToGlobalFormat(cmd)).toThrow(/declares its own option 'output'/)
	})
})
