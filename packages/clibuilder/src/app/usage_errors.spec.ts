import { getBaseCommand } from '../builtin/base_command.js'
import { type cli, command, parseArgv, z } from '../index.js'
import { lookupCommand } from '../invocation/lookup.js'
import { argv } from '../test-utils/index.js'
import { resolveGlobalOptions, resolveUsageErrors, usageErrorCode } from './usage_errors.js'

function resolve(cmd: cli.Command, args: string, globalFormat?: cli.Format) {
	const baseCommand = getBaseCommand('', { format: globalFormat })
	const rawArgs = parseArgv(argv(args))
	const globals = resolveGlobalOptions(baseCommand, rawArgs, globalFormat ?? 'toon')
	const r = lookupCommand({ name: '', commands: [cmd] }, rawArgs, baseCommand)
	return { globals, errors: resolveUsageErrors(r.errors, r.command, baseCommand, globals) }
}

describe('usageErrorCode()', () => {
	it.each<[cli.UsageError, string]>([
		[{ type: 'invalid-key', key: 'x' }, 'unknown-option'],
		[{ type: 'conflicting-options', key: 'a', conflictsWith: 'b' }, 'conflicting-options'],
		[{ type: 'invalid-value', key: 'x', value: 'y', message: 'm' }, 'invalid-value'],
		[{ type: 'expect-single', key: 'x', value: ['1', '2'] }, 'expect-single'],
		[{ type: 'missing-argument', name: 'x' }, 'missing-argument'],
		[{ type: 'extra-arguments', name: 'x', values: ['y'] }, 'extra-arguments']
	])('maps %o to %s', (error, code) => {
		expect(usageErrorCode(error)).toBe(code)
	})
})

describe('resolveGlobalOptions()', () => {
	it('reads --format when the global format is active', () => {
		const { globals, errors } = resolve(command({ name: 'sub', run() {} }), 'cli sub --format text', 'json')
		expect(globals.format).toBe('text')
		expect(errors).toEqual([])
	})
	it('falls back to the default format when --format is not passed', () => {
		const { globals } = resolve(command({ name: 'sub', run() {} }), 'cli sub', 'json')
		expect(globals.format).toBe('json')
	})
	it('falls back to the default format for a bad --format, and reports it with the allowed formats', () => {
		const { globals, errors } = resolve(command({ name: 'sub', run() {} }), 'cli sub --format yaml', 'json')
		expect(globals.format).toBe('json')
		expect(errors).toEqual([
			{
				type: 'invalid-value',
				key: 'format',
				value: 'yaml',
				message: 'expected one of: toon, json, text',
				allowed: ['toon', 'json', 'text']
			}
		])
		expect(errors[0]!.code).toBe('invalid-value')
	})
	it('falls back to the default format for a repeated --format', () => {
		const { globals, errors } = resolve(
			command({ name: 'sub', run() {} }),
			'cli sub --format json --format text',
			'toon'
		)
		expect(globals.format).toBe('toon')
		expect(errors.map((e) => e.code)).toEqual(['expect-single'])
	})
	it('reports --format as unknown when the global format is not active', () => {
		const { globals, errors } = resolve(command({ name: 'sub', run() {} }), 'cli sub --format json')
		expect(globals.format).toBe('toon')
		expect(errors.map((e) => e.code)).toEqual(['unknown-option'])
	})
	it('reads the global flags from the base command', () => {
		const { globals } = resolve(command({ name: 'sub', run() {} }), 'cli sub --verbose --bogus')
		expect(globals).toMatchObject({ verbose: true, format: 'toon', errors: [] })
	})
	it('keeps only the errors on the global options', () => {
		const { globals } = resolve(command({ name: 'sub', run() {} }), 'cli sub --verbose=nope --bogus')
		expect(globals.errors).toEqual([
			{ type: 'invalid-value', key: 'verbose', value: 'nope', message: 'expected to be boolean' }
		])
	})
})

describe('resolveUsageErrors()', () => {
	const sub = command({ name: 'sub', run() {} })
	it('drops a well-formed global flag the sub command does not declare', () => {
		expect(resolve(sub, 'cli sub --silent=false').errors).toEqual([])
	})
	it('reports a malformed global flag as the base command does, once', () => {
		const { errors } = resolve(sub, 'cli sub --verbose=nope')
		expect(errors).toEqual([
			{ type: 'invalid-value', key: 'verbose', value: 'nope', message: 'expected to be boolean' }
		])
		expect(errors[0].code).toBe('invalid-value')
	})
	it('reports a malformed alias of a global flag under the alias', () => {
		const { errors } = resolve(sub, 'cli sub -V=nope')
		expect(errors).toEqual([{ type: 'invalid-value', key: 'V', value: 'nope', message: 'expected to be boolean' }])
	})
	it("keeps the order of the matched command's errors", () => {
		const { errors } = resolve(sub, 'cli sub --bogus --verbose=nope extra')
		expect(errors.map((e) => e.code)).toEqual(['extra-arguments', 'unknown-option', 'invalid-value'])
	})
	it("leaves a key the matched command declares to the command's own declaration", () => {
		const own = command({ name: 'sub', options: { verbose: { type: z.string(), description: 'own' } }, run() {} })
		expect(resolve(own, 'cli sub --verbose=loud').errors).toEqual([])
	})
	it('sets `code` without changing equality or serialization', () => {
		const { errors } = resolve(sub, 'cli sub --bogus')
		expect(errors[0].code).toBe('unknown-option')
		expect(errors).toEqual([{ type: 'invalid-key', key: 'bogus' }])
		expect(JSON.stringify(errors[0])).toBe('{"type":"invalid-key","key":"bogus"}')
	})
})
