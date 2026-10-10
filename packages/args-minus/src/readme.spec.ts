import { readFileSync } from 'node:fs'
import { ParseArgsError, parseArgs, tokenizeArgs } from './index.js'

// Runs every example in readme.md: an expression, then `// => value` or `// throws text`.
const readme = readFileSync(new URL('../readme.md', import.meta.url), 'utf8')
const blocks = [...readme.matchAll(/```ts\n([\s\S]*?)```/g)].map((m) => m[1]!).filter((b) => !b.startsWith('import'))

function evaluate(code: string) {
	return new Function('parseArgs', 'tokenizeArgs', `return (${code})`)(parseArgs, tokenizeArgs)
}

const examples = blocks.flatMap((block) =>
	block
		.split(/\n\n/)
		.map((chunk) => chunk.trim())
		.filter((chunk) => /\/\/ (=>|throws) /.test(chunk))
		.map((chunk) => {
			const at = chunk.search(/\n\/\/ (=>|throws) /)
			return { code: chunk.slice(0, at), expect: chunk.slice(at + 1) }
		})
)

it('finds the readme examples', () => {
	expect(examples.length).toBeGreaterThanOrEqual(14)
})

describe('readme examples', () => {
	it.each(examples.map((e) => [e.code, e] as const))('%s', (_, example) => {
		if (example.expect.startsWith('// =>')) {
			expect(evaluate(example.code)).toEqual(evaluate(example.expect.slice(6)))
		} else {
			const text = example.expect.slice('// throws '.length)
			let error: unknown
			try {
				evaluate(example.code)
			} catch (e) {
				error = e
			}
			expect(error).toBeInstanceOf(Error)
			expect((error as Error).message).toContain(text)
			expect(error).toBeInstanceOf(ParseArgsError)
		}
	})
})
