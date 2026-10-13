import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import * as axi from './axi.js'
import { command, exitCodes } from './index.js'
import { encode } from './render/encode.js'
import { testCommand } from './testing/index.js'

describe('clibuilder/axi', () => {
	it('exports the value helpers, the output contract, the runner and the exit codes', () => {
		expect(Object.keys(axi).sort()).toEqual([
			'CliError',
			'collapseHome',
			'defaultTextLimit',
			'document',
			'empty',
			'encode',
			'errorOutput',
			'exitCodes',
			'formats',
			'fullOption',
			'homeHeader',
			'isCliError',
			'orEmpty',
			'placeholder',
			'printAnswer',
			'ref',
			'result',
			'runScript',
			'truncateList',
			'truncateText'
		])
		expect(axi.exitCodes).toBe(exitCodes)
	})
})

describe('fullOption', () => {
	const show = command({
		name: 'show',
		options: { full: axi.fullOption },
		run(args) {
			return axi.truncateText('abcdef', { limit: 3, full: args.full })
		}
	})

	it('is an optional flag', async () => {
		expect((await testCommand(show, 'show')).result).toEqual({
			text: 'abc\n... (truncated, 6 chars total)',
			truncated: true
		})
		expect((await testCommand(show, 'show --full')).result).toEqual({ text: 'abcdef', truncated: false })
	})
})

describe('encoded', () => {
	// The TOON header counts the rows shown; the total lives in `count`.
	it('keeps the TOON row count to the rows shown', () => {
		const { items, count } = axi.truncateList([{ id: 1 }, { id: 2 }, { id: 3 }], { limit: 2 })
		expect(encode({ count, tasks: items }, 'toon')).toBe('count: 2 of 3 total\ntasks[2]{id}:\n  1\n  2')
	})

	it('states the zero instead of an empty list', () => {
		expect(encode({ tasks: axi.orEmpty([], '0 open tasks found') }, 'toon')).toBe('tasks: 0 open tasks found')
	})
})

// `biome.json` holds the same boundary as a lint rule. This also covers `require()`, which the rule does not see.
describe('axi/', () => {
	const dir = join(dirname(fileURLToPath(import.meta.url)), 'axi')

	function files(path: string): string[] {
		return readdirSync(path, { withFileTypes: true }).flatMap((entry) => {
			const file = join(path, entry.name)
			if (entry.isDirectory()) return files(file)
			return entry.name.endsWith('.ts') ? [file] : []
		})
	}

	it('imports only Node built-ins and its own files', () => {
		const specifier = /(?:\bfrom|\bimport|\brequire\s*\()\s*\(?\s*['"]([^'"]+)['"]/g
		const offenders = files(dir).flatMap((file) =>
			[...readFileSync(file, 'utf8').matchAll(specifier)]
				.map((m) => m[1] as string)
				.filter((s) => {
					if (s.startsWith('node:')) return false
					if (!s.startsWith('.')) return true
					return relative(dir, resolve(dirname(file), s)).startsWith('..')
				})
				.map((s) => `${relative(dir, file)} -> ${s}`)
		)
		expect(offenders).toEqual([])
	})
})

// tier B (axi-native RFC section 4.1): `biome.json` holds the lint rule; this also covers `require()`
describe('tier B', () => {
	const src = dirname(fileURLToPath(import.meta.url))
	const contract = ['render/encode.ts', 'render/answer.ts', 'render/text.ts', 'render/ref.ts', 'app/errors.ts']
	const allowed = [...contract, 'axi/', 'script/']
	// the runner also shares `cli()`'s lookup and usage-error report (#706); `script/bundle_size.spec.ts` checks it bundles nothing else
	const scriptAllowed = [
		...allowed,
		'render/usage_error.ts',
		'invocation/argv.ts',
		'invocation/descriptors.ts',
		'invocation/lookup.ts'
	]

	function files(path: string): string[] {
		return readdirSync(path, { withFileTypes: true }).flatMap((entry) => {
			const file = join(path, entry.name)
			if (entry.isDirectory()) return files(file)
			return entry.name.endsWith('.ts') && !entry.name.endsWith('.spec.ts') ? [file] : []
		})
	}

	it('keeps the output contract and the runner free of the framework', () => {
		const specifier = /(?:\bfrom|\bimport|\brequire\s*\()\s*\(?\s*['"]([^'"]+)['"]/g
		const tierB = [...contract.map((f) => join(src, f)), ...files(join(src, 'script'))]
		const offenders = tierB.flatMap((file) =>
			// comments hold example imports
			[
				...readFileSync(file, 'utf8')
					.replace(/\/\*[\s\S]*?\*\//g, '')
					.matchAll(specifier)
			]
				.map((m) => m[1] as string)
				.filter((s) => {
					if (s === '@toon-format/toon' || s === 'args-minus') return false
					// the runner finds a ref's target script on disk (next-step-refs RFC section 5)
					if ((s === 'node:fs' || s === 'node:path') && relative(src, file).startsWith('script')) return false
					if (!s.startsWith('.')) return true
					const target = relative(src, resolve(dirname(file), s))
						.replace(/\\/g, '/')
						.replace(/\.js$/, '.ts')
					const list = relative(src, file).startsWith('script') ? scriptAllowed : allowed
					return !list.some((a) => (a.endsWith('/') ? target.startsWith(a) : target === a))
				})
				.map((s) => `${relative(src, file)} -> ${s}`)
		)
		expect(offenders).toEqual([])
	})
})
