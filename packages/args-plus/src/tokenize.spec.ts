import { tokenize } from './index.js'

it('returns empty array for empty argv', () => {
	expect(tokenize([])).toEqual([])
})

it('parse long option as option', () => {
	expect(tokenize(['--opt'])).toEqual([
		{
			kind: 'option',
			index: 0,
			name: 'opt',
			raw: '--opt'
		}
	])
})

it('parse short option as option', () => {
	expect(tokenize(['-a'])).toEqual([
		{
			kind: 'option',
			index: 0,
			name: 'a',
			raw: '-a'
		}
	])
})

it('split multiple short options', () => {
	// console.info(
	// 	parseArgs({
	// 		args: ['-abc', '-bca'],
	// 		tokens: true,
	// 		options: {
	// 			a: { type: 'boolean' },
	// 			b: { type: 'boolean' },
	// 			c: { type: 'boolean' }
	// 		}
	// 	})
	// )
	expect(tokenize(['-abc'])).toEqual([
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
	])
})

it('parse option-terminator', () => {
	expect(tokenize(['--'])).toEqual([
		{
			kind: 'option-terminator',
			index: 0
		}
	])
})
