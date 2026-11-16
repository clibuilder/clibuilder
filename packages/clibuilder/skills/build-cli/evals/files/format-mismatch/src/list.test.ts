import { testCommand } from 'clibuilder/testing'
import { describe, expect, test } from 'vitest'
import { list } from './list.js'

describe('list', () => {
	test('S1 answers in toon without --format', async () => {
		const { messages, exitCode } = await testCommand(list, 'list')
		expect(exitCode).toBeUndefined()
		expect(messages).toContain('items[2]')
	})

	test('S2 lists every open task', async () => {
		const { messages } = await testCommand(list, 'list')
		expect(messages).toContain('write the docs')
		expect(messages).toContain('fix the build')
	})
})
