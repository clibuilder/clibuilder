import { wrap } from './wrap.js'

describe('wrap()', () => {
	it('keeps text that fits on one line', () => {
		expect(wrap('a, b, c', 80)).toBe('a, b, c')
	})

	it('keeps an empty text empty', () => {
		expect(wrap('', 80)).toBe('')
	})

	it('breaks between words at the width', () => {
		expect(wrap('aaa, bbb, ccc', 10)).toBe('aaa, bbb,\nccc')
	})

	it('fills a line up to exactly the width', () => {
		expect(wrap('aaaa bbbb', 9)).toBe('aaaa bbbb')
	})

	// the space after a word counts toward the width, as in the wordwrap package this replaces
	it('counts the space after a word toward the width', () => {
		expect(wrap('aaaa bbbb c', 9)).toBe('aaaa\nbbbb c')
	})

	it('drops the spaces at the end of a broken line and at the start of the next', () => {
		expect(wrap('aa    bb    cc', 7)).toBe('aa\nbb\ncc')
	})

	it('keeps a word longer than the width whole on its own line', () => {
		expect(wrap(`a ${'x'.repeat(12)} b`, 10)).toBe(`a\n${'x'.repeat(12)}\nb`)
	})

	// also as in wordwrap: help never shows this, as no command name is that long
	it('starts with an empty line when the first word does not fit', () => {
		expect(wrap('aaaa    bbbb', 6)).toBe('\naaaa\nbbbb')
	})

	it('starts a new line at a newline in the text', () => {
		expect(wrap('a\nb c', 80)).toBe('a\nb c')
	})

	it('counts a tab as four spaces', () => {
		expect(wrap('a\tb', 80)).toBe('a    b')
	})

	it('wraps a long command list at 80 columns as help shows it', () => {
		const names = Array.from({ length: 12 }, (_, i) => `command-${i}`).join(', ')
		expect(wrap(names, 80)).toBe(
			'command-0, command-1, command-2, command-3, command-4, command-5, command-6,\ncommand-7, command-8, command-9, command-10, command-11'
		)
	})
})
