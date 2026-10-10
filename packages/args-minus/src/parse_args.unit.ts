import { parseArgs } from './index.js'

it('parses empty args', () => {
	expect(parseArgs({ args: [] })).toEqual({
		_: [],
		__: [],
		options: {}
	})
})

it('supports options with 3 or more dashes', () => {
	expect(parseArgs({ args: ['---abc'] }).options).toEqual({ abc: true })
	expect(parseArgs({ args: ['-----abc'] }).options).toEqual({ abc: true })
})

it('does not export the removed argsStrictParser', async () => {
	const api = await import('./index.js')
	expect(Object.keys(api).sort()).toEqual(['parseArgs', 'tokenizeArgs'])
})
