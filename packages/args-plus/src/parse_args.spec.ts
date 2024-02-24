import { parseArgs } from './index.js'

it('provides a singleton parser for ease of use', () => {
	expect(parseArgs.parse([])).toEqual({ _: [] })
})
