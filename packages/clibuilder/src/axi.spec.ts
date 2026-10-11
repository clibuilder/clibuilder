import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import * as axi from './axi.js'
import { command, exitCodes } from './index.js'
import { encode } from './render/encode.js'
import { testCommand } from './testing/index.js'

describe('clibuilder/axi', () => {
	it('exports the value helpers, the result channel and the exit codes', () => {
		expect(Object.keys(axi).sort()).toEqual([
			'collapseHome',
			'defaultTextLimit',
			'document',
			'empty',
			'exitCodes',
			'fullOption',
			'homeHeader',
			'orEmpty',
			'result',
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
