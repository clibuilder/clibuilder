import { parseArgs, type ParseArgsConfig } from 'util'
import { tokenize, type Token } from './index.js'

it('returns empty array for empty argv', () => {
	testTokenize([], [])
})

it('parse long option as option', () => {
	testTokenize(
		['--opt'],
		[
			{
				kind: 'option',
				index: 0,
				name: 'opt',
				raw: '--opt'
			}
		]
	)
})

it('parse short option as option', () => {
	testTokenize(
		['-a'],
		[
			{
				kind: 'option',
				index: 0,
				name: 'a',
				raw: '-a'
			}
		]
	)
})

it('split multiple short options', () => {
	testTokenize(
		['-abc'],
		[
			{
				kind: 'option',
				index: 0,
				name: 'a',
				raw: '-a'
			},
			{
				kind: 'option',
				index: 0,
				name: 'b',
				raw: '-b'
			},
			{
				kind: 'option',
				index: 0,
				name: 'c',
				raw: '-c'
			}
		]
	)
})

it('parse option-terminator', () => {
	testTokenize(
		['--'],
		[
			{
				kind: 'option-terminator',
				index: 0
			}
		]
	)
})

function testTokenize(args: string[], expected: Token[], parseArgsOptions: ParseArgsConfig['options'] = undefined) {
	const result = tokenize(args)
	if (parseArgsOptions) {
		console.info('args:', args)
		parseArgs()
		console.info(
			'parseArgs:',
			parseArgs({
				args,
				tokens: true,
				options: parseArgsOptions
			})
		)
		console.info('tokenize:', result)
	}
	expect(result).toEqual(expected)
}
