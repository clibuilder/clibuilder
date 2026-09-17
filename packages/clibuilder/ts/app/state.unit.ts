import { a } from 'assertron'
import { state } from './state.js'

it('gets name as the keywords', () => {
	const r = state({ name: 'foo', config: true, version: '1.0.0' })
	a.satisfies(r, {
		keywords: ['foo']
	})
})

it('keeps keywords if defined', () => {
	const r = state({ name: 'foo', config: true, version: '1.0.0', keywords: ['bar'] })
	a.satisfies(r, {
		keywords: ['bar']
	})
})
