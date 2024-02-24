import { argsParser } from './index.js'

it('keeps arguments under _ ', () => {
	const parser = argsParser()
	expect(parser.parse([])._).toEqual([])

	expect(parser.parse(['a', 'b'])._).toEqual(['a', 'b'])
})
