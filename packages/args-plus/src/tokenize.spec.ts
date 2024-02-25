import { parseArgs, type ParseArgsConfig } from 'util'
import { tokenize, type Token } from './index.js'

it('returns empty array for empty argv', () => {
	testTokenize([], [])
})

it('parse arguments as positionals', () => {
	testTokenize(
		['abc', 'def'],
		[
			{ kind: 'positional', index: 0, value: 'abc' },
			{ kind: 'positional', index: 1, value: 'def' }
		]
	)
})

it('parse long option as option', () => {
	testTokenize(
		['--opt', '--xyz', 'abc'],
		[
			{
				kind: 'option',
				index: 0,
				name: 'opt',
				dashes: 2,
				raw: '--opt'
			},
			{ kind: 'option', index: 1, name: 'xyz', dashes: 2, raw: '--xyz' },
			{ kind: 'positional', index: 2, value: 'abc' }
		]
	)
})

it('extracts option value from --opt=abc', () => {
	testTokenize(
		['--opt=abc'],
		[
			{
				kind: 'option',
				name: 'opt',
				raw: '--opt=abc',
				index: 0,
				dashes: 2,
				value: 'abc'
			}
		]
	)
})

it('extracts short option value from -o=abc', () => {
	// This is different than the NodeJS implementation.
	// I feel that that is more for legacy purpose and is mostly not used.
	// We are keeping it simple and consistent here.
	// If the application requires NodeJS like behavior,
	// it can handle it anyway and this can bee seen as an error,
	// or appending the `=` back to the `value`.
	testTokenize(
		['-o=abc'],
		[
			{
				kind: 'option',
				name: 'o',
				raw: '-o=abc',
				index: 0,
				dashes: 1,
				value: 'abc'
			}
		]
	)
})

it('parse short option as option', () => {
	testTokenize(
		['-a', 'abc'],
		[
			{
				kind: 'option',
				index: 0,
				name: 'a',
				dashes: 1,
				raw: '-a'
			},
			{ kind: 'positional', index: 1, value: 'abc' }
		]
	)
})

it('keep short option group', () => {
	// without knowing what is the defined option,
	// there is no way to determine if `-abc` means `-a -b -c`,
	// or `-a` with value `bc`.
	// That should be done at the parsing stage.
	testTokenize(
		['-abc', 'def'],
		[
			{
				kind: 'option',
				index: 0,
				name: 'abc',
				dashes: 1,
				raw: '-abc'
			},
			{ kind: 'positional', index: 1, value: 'def' }
		]
	)
})

it('parse option-terminator', () => {
	testTokenize(['--'], [{ kind: 'option-terminator', index: 0 }])
})

it('treat input after option-terminator to be positional', () => {
	testTokenize(
		['--', 'abc', '-a'],
		[
			{ kind: 'option-terminator', index: 0 },
			{ kind: 'positional', index: 1, value: 'abc' },
			{ kind: 'positional', index: 2, value: '-a' }
		]
	)
})

it('parse single dash as positional', () => {
	testTokenize(['-'], [{ kind: 'positional', index: 0, value: '-' }])
})

it('parse 3 or more dashes as positional', () => {
	testTokenize(
		['---', '----'],
		[
			{ kind: 'positional', index: 0, value: '---' },
			{ kind: 'positional', index: 1, value: '----' }
		]
	)
})
function testTokenize(args: string[], expected: Token[], parseArgsOptions: ParseArgsConfig['options'] = undefined) {
	const result = tokenize(args)
	if (parseArgsOptions) {
		console.info('args:', args)
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
