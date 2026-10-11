import { Writable } from 'node:stream'
import { type cli, command, cli as createCli, t } from 'clibuilder'
import { afterEach, describe, expect, it } from 'vitest'
import type { OutputFormat } from './format.js'
import { encodeError } from './output.js'
import { createUsageErrorHandler } from './usage.js'

/**
 * Proves that clibuilder's built-in usage-error report under `cli({ output: 'axi' })` is what
 * `createUsageErrorHandler()` writes for the same invocation, in toon, json and text,
 * apart from the differences axi-native RFC section 3.3 makes on purpose:
 *
 * - only the top-ranked error is reported, not every error joined with `; `;
 * - an extra argument is coded `extra-arguments`, not `unexpected-argument`;
 * - `help` leads with the command's usage line;
 * - the offending option or argument, and the value as typed, are fields (`details`);
 * - an `invalid-value` error's `help` adds the allowed values or the violated constraint, with the value as typed.
 *
 * Each case states the core-only additions, so any other difference fails it.
 */

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

const list = command({
	name: 'list',
	description: 'list tasks',
	arguments: [{ name: 'repo', description: 'the repo', type: t.string() }],
	options: {
		state: { type: t.enum(['open', 'closed']).optional(), description: 'the state' },
		limit: { type: t.int({ min: 1, max: 100 }).optional(), description: 'how many' },
		tag: { type: t.string({ pattern: /^v\d+$/ }).optional(), description: 'the tag' },
		count: { type: t.number().optional(), description: 'a number' },
		full: { type: t.boolean().optional(), description: 'everything', conflicts: ['brief'] },
		brief: { type: t.boolean().optional(), description: 'a summary' }
	},
	run() {}
})

const usage = 'Usage: app list <arguments> [options]'

async function parse(args: string, options: Partial<cli.Options>) {
	const stdout = memoryStream()
	const stderr = memoryStream()
	const code = await createCli({ name: 'app', version: '1.0.0', streams: { stdout, stderr }, ...options })
		.command(list)
		.parse(['node', 'app', ...args.split(' ')])
	return { code, stdout: stdout.text, stderr: stderr.text }
}

/**
 * What `createUsageErrorHandler()` writes, run as the cli's handler in the default output.
 */
async function viaAxi(args: string, format: OutputFormat) {
	let written = ''
	const r = await parse(args, {
		onUsageError: createUsageErrorHandler({ format, stdout: { write: (s) => (written += s) } })
	})
	return { ...r, written }
}

/**
 * What core writes by itself under output axi.
 */
function viaCore(args: string, format: OutputFormat) {
	return parse(args, { output: 'axi', format })
}

/**
 * The report `createUsageErrorHandler()` made, read back from its json.
 */
async function axiReport(args: string) {
	const { written } = await viaAxi(args, 'json')
	return JSON.parse(written) as { error: string; code: string; help?: string[] }
}

type Additions = { details: Record<string, unknown>; valueHelp?: string }

const corpus: Array<[string, string, Additions]> = [
	['unknown option', 'repo --stat open', { details: { option: '--stat' } }],
	['conflicting options', 'repo --full --brief', { details: { option: '--full', conflictsWith: '--brief' } }],
	[
		'invalid value of a t.enum',
		'repo --state merged',
		{
			details: { option: '--state', value: 'merged' },
			valueHelp: 'allowed for --state: open, closed (received "merged")'
		}
	],
	[
		'invalid value of a t.int range',
		'repo --limit 0',
		{ details: { option: '--limit', value: '0' }, valueHelp: 'expected for --limit: int 1..100 (received "0")' }
	],
	[
		'invalid value of a t.string pattern',
		'repo --tag x',
		{ details: { option: '--tag', value: 'x' }, valueHelp: 'expected for --tag: string /^v\\d+$/ (received "x")' }
	],
	[
		'invalid value of a t.number',
		'repo --count abc',
		{ details: { option: '--count', value: 'abc' }, valueHelp: 'expected for --count: number (received "abc")' }
	],
	['expect single', 'repo --count 1 --count 2', { details: { option: '--count', value: ['1', '2'] } }],
	['missing argument', '', { details: { argument: 'repo' } }],
	['extra arguments', 'repo extra', { details: { arguments: ['extra'] } }]
]

afterEach(() => {
	process.exitCode = undefined
})

describe('core usage errors conform to createUsageErrorHandler()', () => {
	describe.each<OutputFormat>(['toon', 'json', 'text'])('in %s', (format) => {
		it.each(corpus)('%s', async (_, rest, additions) => {
			const args = `list ${rest}`.trim()
			const axi = await viaAxi(args, format)
			const core = await viaCore(args, format)
			const report = await axiReport(args)

			expect(core.code).toBe(axi.code)
			expect(core.stderr).toBe('')
			expect(axi.stdout + axi.stderr).toBe('')
			expect(core.stdout).toBe(
				`${encodeError(
					{
						message: report.error,
						code: report.code === 'unexpected-argument' ? 'extra-arguments' : report.code,
						details: additions.details,
						help: [usage, ...(report.help ?? []), ...(additions.valueHelp ? [additions.valueHelp] : [])]
					},
					format
				)}\n`
			)
		})

		it('reports only the top-ranked of several errors, as the first one createUsageErrorHandler() joined', async () => {
			const args = 'list --stat open'
			const report = await axiReport(args)
			expect(report.error).toBe('unknown option --stat; missing required argument <repo>')
			const core = await viaCore(args, format)
			expect(core.stdout).toBe(
				`${encodeError(
					{
						message: report.error.split('; ')[0]!,
						code: report.code,
						details: { option: '--stat' },
						help: [usage, report.help![0]!]
					},
					format
				)}\n`
			)
		})
	})
})
