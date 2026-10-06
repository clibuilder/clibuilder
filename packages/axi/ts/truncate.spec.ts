import { describe, expect, it } from 'vitest'
import { encodeResult } from './output.js'
import { defaultTextLimit, fullOption, orEmpty, truncateList, truncateText } from './truncate.js'

describe('fullOption', () => {
	it('is an optional flag', () => {
		expect(fullOption.type.parse(undefined)).toBeUndefined()
		expect(fullOption.type.parse(true)).toBe(true)
	})
})

describe('truncateText', () => {
	it('keeps a text that fits', () => {
		expect(truncateText('short')).toEqual({ text: 'short', truncated: false })
	})

	it('cuts a long text and says how long it was', () => {
		const body = 'x'.repeat(defaultTextLimit + 100)
		expect(truncateText(body)).toEqual({
			text: `${'x'.repeat(defaultTextLimit)}\n... (truncated, ${defaultTextLimit + 100} chars total)`,
			truncated: true
		})
		expect(truncateText('abcdef', { limit: 3 })).toEqual({
			text: 'abc\n... (truncated, 6 chars total)',
			truncated: true
		})
	})

	it('cuts nothing when --full is set', () => {
		expect(truncateText('abcdef', { limit: 3, full: true })).toEqual({ text: 'abcdef', truncated: false })
	})
})

describe('truncateList', () => {
	it('keeps the first items and counts all of them', () => {
		expect(truncateList(['a', 'b', 'c'], { limit: 2 })).toEqual({
			items: ['a', 'b'],
			count: '2 of 3 total',
			total: 3,
			truncated: true
		})
	})

	it('says the count even when nothing was cut', () => {
		expect(truncateList(['a'], { limit: 2 })).toEqual({
			items: ['a'],
			count: '1 of 1 total',
			total: 1,
			truncated: false
		})
	})

	it('keeps everything when --full is set', () => {
		expect(truncateList(['a', 'b', 'c'], { limit: 2, full: true }).items).toEqual(['a', 'b', 'c'])
	})

	// The TOON header counts the rows shown; the total lives in `count`.
	it('keeps the TOON row count to the rows shown', () => {
		const { items, count } = truncateList([{ id: 1 }, { id: 2 }, { id: 3 }], { limit: 2 })
		expect(encodeResult({ count, tasks: items }, 'toon')).toBe('count: 2 of 3 total\ntasks[2]{id}:\n  1\n  2')
	})
})

describe('orEmpty', () => {
	it('states the zero instead of an empty list', () => {
		expect(encodeResult({ tasks: orEmpty([], '0 open tasks found') }, 'toon')).toBe('tasks: 0 open tasks found')
	})

	it('passes a non-empty list through', () => {
		const tasks = ['a']
		expect(orEmpty(tasks, 'none')).toBe(tasks)
	})
})
