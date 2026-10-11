import { Writable } from 'node:stream'
import { listPluginsCommand } from '../builtin/plugin_commands/list.js'
import { searchPluginsCommand } from '../builtin/plugin_commands/search.js'
import { cli, document, empty, exitCodes, result } from '../index.js'
import { written } from '../render/answer.js'

function memoryStream() {
	const stream = new Writable({
		decodeStrings: false,
		write(chunk, _encoding, callback) {
			stream.text += chunk
			callback()
		}
	}) as Writable & { text: string }
	stream.text = ''
	return stream
}

/**
 * Runs `args` against a cli whose `show` command returns what `returns` gives.
 */
async function runShow(returns: () => unknown, args = '', options: Partial<cli.Options> = { output: 'axi' }) {
	const stdout = memoryStream()
	const stderr = memoryStream()
	const value = await cli({ name: 'app', version: '1.0.0', streams: { stdout, stderr }, ...options })
		.command({
			name: 'show',
			run() {
				return returns()
			}
		})
		.parse(['node', 'app', 'show', ...args.split(' ').filter(Boolean)])
	return { value, stdout: stdout.text, stderr: stderr.text, exitCode: process.exitCode }
}

afterEach(() => {
	process.exitCode = undefined
})

describe('a value returned from run() under output axi', () => {
	it.each([
		['toon', 'plugins[2]: a,b\ncount: 2\n'],
		['json', '{"plugins":["a","b"],"count":2}\n'],
		['text', 'plugins:\n  - a\n  - b\n\ncount: 2\n']
	] as const)('is printed once on stdout in %s', async (format, expected) => {
		const r = await runShow(() => ({ plugins: ['a', 'b'], count: 2 }), `--format ${format}`)
		expect(r.stdout).toBe(expected)
		expect(r.stderr).toBe('')
		expect(r.exitCode).toBeUndefined()
	})

	it('is encoded in the cli format when --format is not passed', async () => {
		const r = await runShow(() => ({ count: 2 }), '', { output: 'axi', format: 'json' })
		expect(r.stdout).toBe('{"count":2}\n')
	})

	it('is what parse() resolves to', async () => {
		const value = { plugins: ['a'] }
		const r = await runShow(() => value)
		expect(r.value).toBe(value)
	})

	it('prints nothing for undefined', async () => {
		const r = await runShow(() => undefined)
		expect(r.stdout).toBe('')
		expect(r.stderr).toBe('')
		expect(r.value).toBeUndefined()
	})

	it('prints nothing for a run() that returns nothing, as from an async run()', async () => {
		const r = await runShow(async () => {})
		expect(r.stdout).toBe('')
	})

	it.each(['toon', 'json', 'text'] as const)('prints a string verbatim, ending on a newline, in %s', async (format) => {
		const r = await runShow(() => '# Title\n\nbody', `--format ${format}`)
		expect(r.stdout).toBe('# Title\n\nbody\n')
		expect(r.value).toBe('# Title\n\nbody')
	})

	it.each([
		['toon', 'result[2]: a,b\n'],
		['json', '{"result":["a","b"]}\n'],
		['text', 'result:\n  - a\n  - b\n']
	] as const)('wraps an array under the result key in %s', async (format, expected) => {
		const r = await runShow(() => ['a', 'b'], `--format ${format}`)
		expect(r.stdout).toBe(expected)
		expect(r.value).toEqual(['a', 'b'])
	})

	it.each([
		['toon', 'result[2]{name,size}:\n  a,1\n  b,2\n'],
		['json', '{"result":[{"name":"a","size":1},{"name":"b","size":2}]}\n'],
		['text', 'result:\n  name  size\n  a     1\n  b     2\n']
	] as const)('wraps an array of records under the result key in %s', async (format, expected) => {
		const r = await runShow(
			() => [
				{ name: 'a', size: 1 },
				{ name: 'b', size: 2 }
			],
			`--format ${format}`
		)
		expect(r.stdout).toBe(expected)
	})

	it.each([
		['toon', 3, 'result: 3\n'],
		['json', 3, '{"result":3}\n'],
		['text', 3, 'result: 3\n'],
		['toon', true, 'result: true\n'],
		['json', false, '{"result":false}\n'],
		['toon', null, 'result: null\n'],
		['json', null, '{"result":null}\n']
	] as const)('wraps a scalar under the result key in %s: %s', async (format, value, expected) => {
		const r = await runShow(() => value, `--format ${format}`)
		expect(r.stdout).toBe(expected)
		expect(r.value).toBe(value)
	})
})

describe('result()', () => {
	const help = ['Run `app show <id>` for one', 'Run `app list --all` for the rest']

	it.each([
		['toon', 'items[2]: a,b\nhelp[2]: Run `app show <id>` for one,Run `app list --all` for the rest\n'],
		['json', '{"items":["a","b"],"help":["Run `app show <id>` for one","Run `app list --all` for the rest"]}\n'],
		['text', 'items:\n  - a\n  - b\n\nhelp:\n  - Run `app show <id>` for one\n  - Run `app list --all` for the rest\n']
	] as const)('encodes the help list inside the result in %s', async (format, expected) => {
		const value = { items: ['a', 'b'] }
		const r = await runShow(() => result(value, { help }), `--format ${format}`)
		expect(r.stdout).toBe(expected)
		expect(r.value).toBe(value)
	})

	it('takes a single help line', async () => {
		const r = await runShow(() => result({ count: 1 }, { help: 'Run `app list`' }))
		expect(r.stdout).toBe('count: 1\nhelp[1]: Run `app list`\n')
	})

	it('leaves out the help key when there is none', async () => {
		const r = await runShow(() => result({ count: 1 }, { help: [] }), '--format json')
		expect(r.stdout).toBe('{"count":1}\n')
	})

	it('replaces a help key on the value, and keeps the help last', async () => {
		const r = await runShow(() => result({ help: 'mine', count: 1 }, { help: 'Run `app list`' }), '--format json')
		expect(r.stdout).toBe('{"count":1,"help":["Run `app list`"]}\n')
	})

	it('wraps an array or a scalar under the result key, with the help beside it', async () => {
		const r = await runShow(() => result(['a'], { help: 'Run `app list`' }), '--format json')
		expect(r.stdout).toBe('{"result":["a"],"help":["Run `app list`"]}\n')
	})

	it('writes a string verbatim, followed by the encoded help', async () => {
		const r = await runShow(() => result('# Title', { help: 'Run `app list`' }))
		expect(r.stdout).toBe('# Title\n\nhelp[1]: Run `app list`\n')
		expect(r.value).toBe('# Title')
	})

	it('writes the renderer for the format verbatim', async () => {
		const value = { items: ['a', 'b'] }
		const r = await runShow(() => result(value, { render: { text: (v) => v.items.join(' | ') } }), '--format text')
		expect(r.stdout).toBe('a | b\n')
		expect(r.value).toBe(value)
	})

	it.each([
		['text', 'a | b\n\nhelp:\n  - Run `app list`\n'],
		['toon', 'a | b\n\nhelp[1]: Run `app list`\n'],
		['json', 'a | b\n\n{"help":["Run `app list`"]}\n']
	] as const)('follows the rendered %s with the help in the same format', async (format, expected) => {
		const r = await runShow(
			() =>
				result(
					{ items: ['a', 'b'] },
					{
						help: 'Run `app list`',
						render: {
							toon: (v) => v.items.join(' | '),
							json: (v) => v.items.join(' | '),
							text: (v) => v.items.join(' | ')
						}
					}
				),
			`--format ${format}`
		)
		expect(r.stdout).toBe(expected)
	})

	it('keeps one blank line between a rendered body ending on a newline and the help', async () => {
		const r = await runShow(() => result({}, { help: 'next', render: { toon: () => 'body\n' } }))
		expect(r.stdout).toBe('body\n\nhelp[1]: next\n')
	})

	it('uses the encoder for a format without a renderer', async () => {
		const r = await runShow(() => result({ count: 1 }, { render: { text: () => 'one' } }), '--format json')
		expect(r.stdout).toBe('{"count":1}\n')
	})
})

describe('document()', () => {
	it.each(['toon', 'json', 'text'] as const)('writes the content exactly as given in %s', async (format) => {
		const r = await runShow(() => document('# Rules\n\nState the zero.\n'), `--format ${format}`)
		expect(r.stdout).toBe('# Rules\n\nState the zero.\n')
		expect(r.value).toBe('# Rules\n\nState the zero.\n')
	})

	it('ends the content on a newline', async () => {
		const r = await runShow(() => document('# Rules'))
		expect(r.stdout).toBe('# Rules\n')
		expect(r.value).toBe('# Rules')
	})
})

describe('empty()', () => {
	it.each([
		['toon', 'empty: 0 open tasks\n'],
		['json', '{"empty":"0 open tasks"}\n'],
		['text', 'empty: 0 open tasks\n']
	] as const)('is a success with the empty state under the empty key in %s', async (format, expected) => {
		const r = await runShow(() => empty('0 open tasks'), `--format ${format}`)
		expect(r.stdout).toBe(expected)
		expect(r.stderr).toBe('')
		expect(r.exitCode).toBeUndefined()
		expect(r.value).toBe('0 open tasks')
	})

	it('encodes its help after the empty state', async () => {
		const r = await runShow(() => empty('0 open tasks', { help: 'Run `app add`' }))
		expect(r.stdout).toBe('empty: 0 open tasks\nhelp[1]: Run `app add`\n')
	})
})

describe('an answer that was already written', () => {
	it('prints nothing more, and parse() resolves to its value', async () => {
		const value = { count: 1 }
		const r = await runShow(() => written(value))
		expect(r.stdout).toBe('')
		expect(r.value).toBe(value)
	})

	it('is recognized by its Symbol.for key, as from another copy of clibuilder', async () => {
		const r = await runShow(() => ({ [Symbol.for('clibuilder.answer')]: 'written', value: 1 }))
		expect(r.stdout).toBe('')
		expect(r.value).toBe(1)
	})
})

describe('a value returned from run() in the default console output', () => {
	it('is not printed, and parse() resolves to it', async () => {
		const value = { count: 1 }
		const r = await runShow(() => value, '', {})
		expect(r.stdout).toBe('')
		expect(r.stderr).toBe('')
		expect(r.value).toBe(value)
	})

	it('is not printed with cli({ format }) either', async () => {
		const r = await runShow(() => ({ count: 1 }), '--format json', { format: 'toon' })
		expect(r.stdout).toBe('')
	})

	it.each([
		['result()', () => result({ count: 1 }, { help: 'next' }), { count: 1 }],
		['document()', () => document('# Rules'), '# Rules'],
		['empty()', () => empty('0 open tasks'), '0 open tasks']
	] as const)('from %s is not printed, and parse() resolves to the wrapped value', async (_, returns, expected) => {
		const r = await runShow(returns, '', {})
		expect(r.stdout).toBe('')
		expect(r.value).toEqual(expected)
	})
})

describe('this.output', () => {
	it.each([
		[{ output: 'axi' }, 'axi'],
		[{ output: 'console' }, 'console'],
		[{}, 'console']
	] as const)('is the cli output mode: %j gives %s', async (options, expected) => {
		let output: cli.Output | undefined
		await cli({
			name: 'app',
			version: '1.0.0',
			streams: { stdout: memoryStream(), stderr: memoryStream() },
			...options
		})
			.command({
				name: 'show',
				run() {
					output = this.output
				}
			})
			.parse(['node', 'app', 'show'])
		expect(output).toBe(expected)
	})
})

describe('the builtin plugins commands under output axi', () => {
	async function run(
		command: typeof listPluginsCommand | typeof searchPluginsCommand,
		args: string,
		options: Partial<cli.Options> = { output: 'axi' }
	) {
		const stdout = memoryStream()
		const stderr = memoryStream()
		const value = await cli({
			name: 'app',
			version: '1.0.0',
			keywords: ['kw-a', 'kw-b'],
			streams: { stdout, stderr },
			...options
		})
			.command(command as any)
			.parse(['node', 'app', ...args.split(' ')])
		return { value, stdout: stdout.text, stderr: stderr.text, exitCode: process.exitCode }
	}
	const list = (installed: string[]) => ({
		...listPluginsCommand,
		context: { findByKeywords: () => Promise.resolve(installed) }
	})
	const search = (found: Record<string, string[]>) => ({
		...searchPluginsCommand,
		context: { searchByKeywords: ([keyword]: string[]) => Promise.resolve(found[keyword!] ?? []) }
	})

	it.each([
		['toon', 'plugins[2]: pkg-x,pkg-y\nhelp[1]: Run `plugins search` to find more plugins on npm\n'],
		['json', '{"plugins":["pkg-x","pkg-y"],"help":["Run `plugins search` to find more plugins on npm"]}\n'],
		[
			'text',
			'found the following plugins:\n\n  pkg-x\n  pkg-y\n\nhelp:\n  - Run `plugins search` to find more plugins on npm\n'
		]
	] as const)('plugins list prints the installed plugins once on stdout in %s', async (format, expected) => {
		const r = await run(list(['pkg-x', 'pkg-y']) as any, `list --format ${format}`)
		expect(r.stdout).toBe(expected)
		expect(r.stderr).toBe('')
		expect(r.value).toEqual({ plugins: ['pkg-x', 'pkg-y'] })
	})

	it('plugins list states nothing installed as an empty state', async () => {
		const r = await run(list([]) as any, 'list')
		expect(r.stdout).toBe(
			'empty: "0 installed plugins found with keywords: kw-a, kw-b"\nhelp[1]: Run `plugins search` to find plugins to install\n'
		)
		expect(r.stderr).toBe('')
		expect(r.exitCode).toBeUndefined()
	})

	it.each([
		['', 'packages[2]: pkg-x,pkg-y\nhelp[1]: Run `plugins list` to see which of them are installed\n'],
		[
			' --fields keywords',
			'packages[2]:\n  - name: pkg-x\n    keywords[2]: kw-a,kw-b\n  - name: pkg-y\n    keywords[1]: kw-b\nhelp[1]: Run `plugins list` to see which of them are installed\n'
		]
	] as const)('plugins search%s prints the found packages once on stdout', async (fields, expected) => {
		const r = await run(search({ 'kw-a': ['pkg-x'], 'kw-b': ['pkg-x', 'pkg-y'] }) as any, `search${fields}`)
		expect(r.stdout).toBe(expected)
		expect(r.stderr).toBe('')
	})

	it('plugins search prints the found packages as prose in text', async () => {
		const r = await run(search({ 'kw-a': ['pkg-x'] }) as any, 'search --format text')
		expect(r.stdout).toBe(
			'found one package: pkg-x\n\nhelp:\n  - Run `plugins list` to see which of them are installed\n'
		)
	})

	it('plugins search states nothing found as an empty state', async () => {
		const r = await run(search({}) as any, 'search --format json')
		expect(r.stdout).toBe('{"empty":"0 packages found with keywords: kw-a, kw-b"}\n')
	})

	it('plugins search reports an unknown --fields value as a usage error on stdout', async () => {
		const r = await run(search({}) as any, 'search --fields size --format json')
		expect(JSON.parse(r.stdout)).toEqual({
			error: 'unknown value for --fields: size',
			code: 'invalid-value',
			option: 'fields',
			value: 'size',
			help: ['The only extra field is `keywords`. Run `plugins search --fields keywords`']
		})
		expect(r.stderr).toBe('')
		expect(r.exitCode).toBe(exitCodes.usage)
	})

	it('keeps console output and return values unchanged', async () => {
		const listed = await run(list(['pkg-x']) as any, 'list', {})
		expect(listed.stdout).toBe('plugins[1]: pkg-x\nhelp[1]: Run `plugins search` to find more plugins on npm\n')
		expect(listed.value).toEqual(['pkg-x'])

		const searched = await run(search({ 'kw-a': ['pkg-x'] }) as any, 'search', {})
		expect(searched.stdout).toBe('packages[1]: pkg-x\nhelp[1]: Run `plugins list` to see which of them are installed\n')
		expect(searched.value).toBeUndefined()
	})
})
