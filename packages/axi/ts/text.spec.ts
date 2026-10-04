import { describe, expect, it } from 'vitest'
import { renderText } from './text.js'

describe('renderText', () => {
	it('aligns a list of records into a table under its key', () => {
		expect(
			renderText({
				bridges: [
					{ harness: 'claude-code', path: '.claude/skills', status: 'ok' },
					{ harness: 'gemini-cli', path: '.gemini/skills', status: 'degraded' }
				]
			})
		).toBe(
			[
				'bridges:',
				'  harness      path            status',
				'  claude-code  .claude/skills  ok',
				'  gemini-cli   .gemini/skills  degraded'
			].join('\n')
		)
	})

	it('leaves a cell blank where a record is missing that column', () => {
		expect(renderText({ rows: [{ a: 'one', b: 'two' }, { a: 'three' }] })).toBe(
			['rows:', '  a      b', '  one    two', '  three'].join('\n')
		)
	})

	it('bullets a list of primitives and marks an empty one', () => {
		expect(renderText({ linked: ['claude-code', 'gemini-cli'], deprecated: [] })).toBe(
			['linked:', '  - claude-code', '  - gemini-cli', '', 'deprecated: (none)'].join('\n')
		)
	})

	it('renders scalars as key and value, and a nested object as JSON', () => {
		expect(renderText({ skills: 0, copied: false, meta: { a: 1 }, none: null })).toBe(
			['skills: 0', 'copied: false', 'meta: {"a":1}', 'none: null'].join('\n')
		)
	})

	// Without the gap a following scalar reads as one more row of the table above it.
	it('separates a multi-line block from its neighbours but keeps scalars together', () => {
		expect(renderText({ bin: '~/bin/bah', help: ['run this'], done: true })).toBe(
			['bin: ~/bin/bah', '', 'help:', '  - run this', '', 'done: true'].join('\n')
		)
	})

	it('renders an empty result as nothing', () => {
		expect(renderText({})).toBe('')
	})
})
