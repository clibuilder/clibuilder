import { Writable } from 'node:stream'
import { cli } from 'clibuilder'
import { plugins } from './index.js'

// The fakes the command specs use, put in place of the two npm-facing packages,
// so the built-in path in `clibuilder` and this package's path both see them.
vi.mock('find-installed-packages', () => ({ findByKeywords: async () => ['pkg-x', 'pkg-y'] }))
vi.mock('search-packages', () => ({ searchByKeywords: async () => ['pkg-a', 'odd,name'] }))

// One keyword: `plugins search` queries once per keyword, concurrently, and under vitest only the
// first of two concurrent calls through a mocked dynamic import reaches the mock. The other one
// queries npm for real. The per-keyword union is covered by the command specs.
const keywords = ['keyword-a']

// Every line the cli writes, named by the stream it went to.
// The built-in ui of clibuilder 12 writes to `cli({ streams })` rather than through `console`.
const lines: string[] = []
function capture(name: 'stdout' | 'stderr') {
	return new Writable({
		decodeStrings: false,
		write(chunk, _encoding, callback) {
			for (const line of String(chunk).replace(/\n$/, '').split('\n')) lines.push(`${name}: ${line}`)
			callback()
		}
	})
}
const streams = { stdout: capture('stdout'), stderr: capture('stderr') }

/** Builds and runs a cli, capturing what it writes, whichever console method it goes through. */
async function run(build: () => { parse(argv: string[]): Promise<any> }, line: string) {
	lines.length = 0
	const exitCode = process.exitCode
	try {
		const result = await build().parse(['node', 'test-cli', ...line.split(' ')])
		return { result, output: lines.join('\n'), exitCode: process.exitCode }
	} finally {
		process.exitCode = exitCode
	}
}

function builtIn() {
	// `keywords` makes the cli executable at runtime, but only the `config` overload of `cli()` says so.
	return cli({ name: 'test-cli', version: '1.0.0', keywords, streams }) as cli.Builder & cli.Executable
}

function extended() {
	return cli({ name: 'test-cli', version: '1.0.0', streams }).use(plugins({ keywords }))
}

describe.each([
	'plugins list',
	'plugins list --format text',
	'plugins list --format json',
	'plugins ls',
	'plugins search',
	'plugins search --fields keywords',
	'plugins search --format text',
	'plugins search --format json --fields keywords',
	'plugins search --fields author',
	'plugins list --format yaml',
	'plugins --help',
	'plugins'
])('%s', (line) => {
	it('behaves the same with plugins() as with the built-in plugins group', async () => {
		const expected = await run(builtIn, line)
		const actual = await run(extended, line)
		expect(actual).toEqual(expected)
		expect(actual.output).not.toBe('')
	})
})

it('reports the fakes, so the comparison is not between two empty outputs', async () => {
	expect((await run(extended, 'plugins list')).output).toContain('plugins[2]: pkg-x,pkg-y')
	expect((await run(extended, 'plugins search')).output).toContain('packages[2]: pkg-a,"odd,name"')
})
