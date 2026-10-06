import { describe, expect, it } from 'vitest'
import { helpLines, withHelp } from './help.js'

describe('helpLines', () => {
	it('takes one suggestion or several, and nothing as none', () => {
		expect(helpLines('Run `a`')).toEqual(['Run `a`'])
		expect(helpLines(['Run `a`', 'Run `b`'])).toEqual(['Run `a`', 'Run `b`'])
		expect(helpLines(undefined)).toEqual([])
	})
})

describe('withHelp', () => {
	it('appends the suggestions last, after the answer', () => {
		expect(Object.keys(withHelp({ tasks: [], count: '0 of 0 total' }, 'Run `a`'))).toEqual(['tasks', 'count', 'help'])
	})

	it('leaves a self-contained answer alone', () => {
		const value = { task: 1 }
		expect(withHelp(value, [])).toBe(value)
		expect(withHelp(value, undefined)).toBe(value)
	})

	it('replaces a help key the value already had, rather than writing two', () => {
		expect(withHelp({ help: ['old'], a: 1 }, 'new')).toEqual({ a: 1, help: ['new'] })
	})
})
