import { createParser, parser } from './index.js'

it('keeps arguments under _ ', () => {
	const parser = createParser()
	expect(parser.parse([])._).toEqual([])
})

it('provides a singleton parser for ease of use', () => {
	expect(parser.parse([])).toEqual({ _: [] })
})
