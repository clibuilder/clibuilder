import { describe, expect, it } from 'vitest'
import { collapseHome, homeHeader } from './home.js'

describe('collapseHome', () => {
	it('shortens a path under the home directory to ~', () => {
		expect(collapseHome('/home/me/.local/bin/tool', '/home/me')).toBe('~/.local/bin/tool')
		expect(collapseHome('/home/me', '/home/me')).toBe('~')
		expect(collapseHome('C:\\Users\\me\\bin\\tool', 'C:\\Users\\me')).toBe('~\\bin\\tool')
	})

	it('leaves a path outside it alone, including a sibling that shares the prefix', () => {
		expect(collapseHome('/usr/bin/tool', '/home/me')).toBe('/usr/bin/tool')
		expect(collapseHome('/home/mel/tool', '/home/me')).toBe('/home/mel/tool')
		expect(collapseHome('/home/me/tool', '')).toBe('/home/me/tool')
	})
})

describe('homeHeader', () => {
	it('names the binary and what it is for, first', () => {
		expect(homeHeader({ description: 'Manage plugins', bin: '/home/me/bin/tool', home: '/home/me' })).toEqual({
			bin: '~/bin/tool',
			description: 'Manage plugins'
		})
	})

	it('defaults to the running script', () => {
		expect(homeHeader({ description: 'd', home: '/nowhere' }).bin).toBe(process.argv[1])
	})
})
