import { tokenize } from './index.js'

it('returns empty array for empty argv', () => {
	expect(tokenize([])).toEqual([])
})

it('parse long option as option', () => {
	expect(tokenize(['--opt'])).toEqual([
		{
			type: 'option',
			index: 0,
			name: 'opt',
			raw: '--opt'
		}
	])
})

it('parse short option as option', () => {
	expect(tokenize(['-a'])).toEqual([
		{
			type: 'option',
			index: 0,
			name: 'a',
			raw: '-a'
		}
	])
})
