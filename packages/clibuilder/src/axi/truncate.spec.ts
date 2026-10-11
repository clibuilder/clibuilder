import { defaultTextLimit, orEmpty, truncateList, truncateText } from './truncate.js'

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
})

describe('orEmpty', () => {
	it('states the zero instead of an empty list', () => {
		expect(orEmpty([], '0 open tasks found')).toBe('0 open tasks found')
	})

	it('passes a non-empty list through', () => {
		const tasks = ['a']
		expect(orEmpty(tasks, 'none')).toBe(tasks)
	})
})
