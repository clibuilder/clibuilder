import { describe, expect, it } from 'vitest'
import { defineFormatOption, formatOption, formats, parseFormat } from './format.js'

describe('formats', () => {
	it('lists toon first, as the default', () => {
		expect(formats).toEqual(['toon', 'json', 'text'])
	})
})

describe('parseFormat', () => {
	it('accepts every supported format', () => {
		expect(parseFormat('toon')).toBe('toon')
		expect(parseFormat('json')).toBe('json')
		expect(parseFormat('text')).toBe('text')
	})

	it('rejects anything else rather than falling back silently', () => {
		expect(() => parseFormat('yaml')).toThrow('--format must be toon, json, or text.')
		expect(() => parseFormat(undefined)).toThrow('--format must be toon, json, or text.')
	})
})

describe('formatOption', () => {
	it('defaults to toon and says so', () => {
		expect(formatOption.default).toBe('toon')
		expect(formatOption.description).toBe(
			'Output format: toon (default), json, text — toon for agents, json to pipe, text for humans'
		)
	})

	it('accepts the supported formats and leaves room for the default', () => {
		expect(formatOption.type.parse('json')).toBe('json')
		expect(formatOption.type.parse(undefined)).toBeUndefined()
		expect(formatOption.type.safeParse('yaml').success).toBe(false)
	})
})

describe('defineFormatOption', () => {
	it('moves the default and the wording with it', () => {
		const option = defineFormatOption({ default: 'text' })
		expect(option.default).toBe('text')
		expect(option.description).toBe(
			'Output format: toon, json, text (default) — toon for agents, json to pipe, text for humans'
		)
	})

	it('takes a description of its own', () => {
		expect(defineFormatOption({ description: 'How to report' }).description).toBe('How to report')
	})
})
