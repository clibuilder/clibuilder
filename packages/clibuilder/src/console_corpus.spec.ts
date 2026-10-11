import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

/**
 * `cli({ output: 'console' })` is the permanent opt-out from the clibuilder 12 default,
 * and it promises the clibuilder 11 output. This spec holds it to that:
 * it runs one corpus of invocations (`fixtures/console-corpus/run.mjs`) against the published
 * clibuilder 11.5.0 and against this build in `output: 'console'`, and compares stdout, stderr,
 * the exit code and what `parse()` resolved to, byte for byte.
 *
 * The only differences allowed are listed in `knownDifferences`, each with the change that made it.
 * Each one must still apply, so the list cannot go stale.
 */

const corpus = resolve(import.meta.dirname, '../fixtures/console-corpus/run.mjs')
const v12 = pathToFileURL(resolve(import.meta.dirname, '../esm/index.js')).href
const v11 = pathToFileURL(createRequire(import.meta.url).resolve('clibuilder-11')).href.replace(
	/\/cjs\/index\.js$/,
	'/esm/index.js'
)

type Result = { name: string; args: string; stdout: string; stderr: string; exitCode: number; value: unknown }

function runCorpus(moduleUrl: string, extra: Record<string, unknown>): Result[] {
	const out = join(mkdtempSync(join(tmpdir(), 'clibuilder-console-corpus-')), 'results.json')
	const env = { ...process.env }
	delete env.FORCE_COLOR
	delete env.NO_COLOR
	const r = spawnSync(process.execPath, [corpus, moduleUrl, out, JSON.stringify(extra)], { env, encoding: 'utf8' })
	if (r.status !== 0) throw new Error(`the console corpus failed against ${moduleUrl}:\n${r.stderr}`)
	return JSON.parse(readFileSync(out, 'utf8'))
}

const options11 = `Options:
  [-h|--help]            Print help message
  [-v|--version]         Print the CLI version
  [-V|--verbose]         Turn on verbose logging
  [--silent]             Turn off logging
  [--debug-cli]          Display clibuilder debug messages
`

const options12 = `Options:
  [-h|--help]                  Print help message
  [-v|--version]               Print the CLI version
  [-V|--verbose]               Turn on verbose logging
  [--silent]                   Turn off logging
  [--debug-cli]                Display clibuilder debug messages
  [--format <toon|json|text>]  Output format: 'toon' for agents, 'json' to pipe, 'text' for humans (default 'toon')
`

/**
 * What clibuilder 12 changes in the console output on purpose, as an edit from the 11.x text to the 12 text.
 */
const knownDifferences: { reason: string; from: string; to: string }[] = [
	{
		reason: 'every cli declares the global --format, and the help lists it (axi-native RFC section 5, item 5)',
		from: options11,
		to: options12
	},
	{
		reason: 'the t descriptors word an invalid boolean differently from zod (#684)',
		from: 'expected to be boolean, received',
		to: 'expected no value, true or false, received'
	}
]

function applyKnownDifferences(text: string, used: Set<string>) {
	for (const d of knownDifferences) {
		if (text.includes(d.from)) {
			used.add(d.reason)
			text = text.split(d.from).join(d.to)
		}
	}
	return text
}

describe('cli({ output: "console" }) against clibuilder 11.5.0', () => {
	const expected = runCorpus(v11, {})
	const actual = runCorpus(v12, { output: 'console' })
	const used = new Set<string>()
	const adjusted = expected.map((r) => ({
		...r,
		stdout: applyKnownDifferences(r.stdout, used),
		stderr: applyKnownDifferences(r.stderr, used)
	}))

	it('runs the same corpus', () => {
		expect(actual.map((r) => r.name)).toEqual(expected.map((r) => r.name))
		expect(expected.length).toBeGreaterThan(20)
	})

	it.each(adjusted.map((r, i) => [r.name, r, i] as const))('writes what 11.x wrote: %s', (_, expected11, i) => {
		expect(actual[i]).toEqual(expected11)
	})

	it('has no stale known difference', () => {
		expect([...used].sort()).toEqual(knownDifferences.map((d) => d.reason).sort())
	})
})
