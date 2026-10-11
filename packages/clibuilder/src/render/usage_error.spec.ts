import { type cli, command, t } from '../index.js'
import { describeInvalidConfig, describeMissingCommand, describeUsageError, topUsageError } from './usage_error.js'

// ported from `@clibuilder/axi`'s `usage.spec.ts`; each help list now leads with the usage line
describe('describeUsageError()', () => {
	const cmd = command({
		name: 'show',
		arguments: [{ name: 'id', description: 'the id', type: t.number().optional() }],
		run() {}
	})
	const usage = 'Usage: app show [arguments]'

	it('reads the optionality of an argument declared with t', () => {
		const tcmd = command({
			name: 'show',
			arguments: [
				{ name: 'id', description: 'the id', type: t.int() },
				{ name: 'tag', description: 'the tag', type: t.string().optional() }
			],
			run() {}
		})
		expect(describeUsageError({ type: 'missing-argument', name: 'id' }, tcmd, 'app').help).toEqual([
			'Usage: app show <arguments>',
			'`show` takes: <id> [tag]'
		])
	})

	it('codes every kind of usage error', () => {
		expect(describeUsageError({ type: 'invalid-key', key: 'x' }, cmd, 'app')).toEqual({
			code: 'unknown-option',
			message: 'unknown option -x',
			details: { option: '-x' },
			help: [usage, '`show` takes no options (--help always allowed)']
		})
		expect(describeUsageError({ type: 'extra-arguments', name: 'id', values: ['a', 'b'] }, cmd, 'app')).toEqual({
			code: 'extra-arguments',
			message: 'unexpected arguments: a, b',
			details: { arguments: ['a', 'b'] },
			help: [usage, '`show` takes: [id]']
		})
		expect(
			describeUsageError({ type: 'invalid-value', key: 'id', message: 'expected number', value: 'a' }, cmd, 'app')
		).toEqual({
			code: 'invalid-value',
			message: 'invalid value for argument <id>: expected number, received "a"',
			details: { argument: 'id', value: 'a' },
			help: [usage]
		})
		expect(describeUsageError({ type: 'conflicting-options', key: 'full', conflictsWith: 'n' }, cmd, 'app')).toEqual({
			code: 'conflicting-options',
			message: 'option --full cannot be used with option -n',
			details: { option: '--full', conflictsWith: '-n' },
			help: [usage]
		})
		expect(
			describeUsageError({ type: 'expect-single', key: 'limit', keyKind: 'number', value: [1, 2] }, cmd, 'app')
		).toEqual({
			code: 'expect-single',
			message: 'option --limit expects a single value, received: 1, 2',
			details: { option: '--limit', value: ['1', '2'] },
			help: [usage]
		})
		expect(describeUsageError({ type: 'missing-argument', name: 'id' }, cmd, 'app')).toEqual({
			code: 'missing-argument',
			message: 'missing required argument <id>',
			details: { argument: 'id' },
			help: [usage, '`show` takes: [id]']
		})
	})

	it('reports a single value that should have been one', () => {
		expect(
			describeUsageError({ type: 'expect-single', key: 'limit', keyKind: 'number', value: 3 }, cmd, 'app').message
		).toBe('option --limit expects a single value, received: 3')
	})

	it('says when a command takes no arguments', () => {
		const bare = command({ name: 'bare', run() {} })
		expect(describeUsageError({ type: 'extra-arguments', name: '', values: ['a'] }, bare, 'app').help).toEqual([
			'Usage: app bare',
			'`bare` takes no arguments'
		])
	})

	it('names the cli for the root command, and lists its commands for an extra argument', () => {
		const root: cli.Command = {
			name: '',
			commands: [command({ name: 'a', run() {} }), command({ name: 'b', run() {} })]
		}
		expect(describeUsageError({ type: 'extra-arguments', name: '', values: ['c'] }, root, 'app').help).toEqual([
			'Usage: app <command>',
			'valid commands for `app`: a, b'
		])
		expect(describeUsageError({ type: 'invalid-key', key: 'x' }, root, 'app').help[1]).toBe(
			'`app` takes no options (--help always allowed)'
		)
	})

	it('names a required option declared with t as an option, listing the options', () => {
		const tcmd = command({ name: 'deploy', options: { env: { type: t.string(), description: 'env' } }, run() {} })
		expect(describeUsageError({ type: 'missing-argument', name: 'env' }, tcmd, 'app')).toEqual({
			code: 'missing-argument',
			message: 'missing required option --env',
			details: { option: '--env' },
			help: ['Usage: app deploy <options>', 'valid options for `deploy`: --env (--help always allowed)']
		})
	})

	describe('invalid-value help', () => {
		const opts = command({
			name: 'opts',
			options: { level: { type: t.int().optional(), description: 'level' } },
			run() {}
		})

		it('lists the allowed values of an enum with the value as typed', () => {
			const e: cli.UsageError = {
				type: 'invalid-value',
				key: 'level',
				message: 'm',
				value: 'urgent',
				keyKind: 'enum',
				constraint: 'low|high',
				allowed: ['low', 'high']
			}
			expect(describeUsageError(e, opts, 'app').help[1]).toBe('allowed for --level: low, high (received "urgent")')
		})

		it('states the violated constraint of a range or a pattern with the value as typed', () => {
			const e: cli.UsageError = {
				type: 'invalid-value',
				key: 'level',
				message: 'm',
				value: '0',
				keyKind: 'int',
				constraint: 'int 1..9'
			}
			expect(describeUsageError(e, opts, 'app').help[1]).toBe('expected for --level: int 1..9 (received "0")')
		})

		it('names the failing element of an array, and every value of a whole-array failure', () => {
			const e: cli.UsageError = {
				type: 'invalid-value',
				key: 'level',
				message: 'm',
				value: 'x',
				constraint: 'int',
				index: 1
			}
			expect(describeUsageError(e, opts, 'app').help[1]).toBe('expected for --level[1]: int (received "x")')
			const all: cli.UsageError = {
				type: 'invalid-value',
				key: 'level',
				message: 'm',
				value: ['1', '2'],
				constraint: 'int'
			}
			expect(describeUsageError(all, opts, 'app')).toMatchObject({
				details: { option: '--level', value: ['1', '2'] },
				help: ['Usage: app opts [options]', 'expected for --level: int (received "1", "2")']
			})
		})

		it('leaves out the value when none was given', () => {
			const e: cli.UsageError = {
				type: 'invalid-value',
				key: 'level',
				message: 'm',
				value: undefined,
				constraint: 'int'
			}
			const r = describeUsageError(e, opts, 'app')
			expect(r.details).toEqual({ option: '--level' })
			expect(r.help[1]).toBe('expected for --level: int')
		})
	})
})

describe('topUsageError()', () => {
	const all: cli.UsageError[] = [
		{ type: 'extra-arguments', name: '', values: ['x'] },
		{ type: 'missing-argument', name: 'a' },
		{ type: 'expect-single', key: 'b', value: ['1', '2'] },
		{ type: 'invalid-value', key: 'c', message: 'm', value: 'v' },
		{ type: 'conflicting-options', key: 'd', conflictsWith: 'e' },
		{ type: 'invalid-key', key: 'f' }
	]

	it('ranks unknown option, conflicting options, invalid value, expect single, missing argument, extra arguments', () => {
		const order: string[] = []
		for (let rest = all; rest.length > 0; ) {
			const top = topUsageError(rest)!
			order.push(top.type)
			rest = rest.filter((e) => e !== top)
		}
		expect(order).toEqual([
			'invalid-key',
			'conflicting-options',
			'invalid-value',
			'expect-single',
			'missing-argument',
			'extra-arguments'
		])
	})

	it('keeps the first of equal rank', () => {
		const a: cli.UsageError = { type: 'invalid-key', key: 'a' }
		const b: cli.UsageError = { type: 'invalid-key', key: 'b' }
		expect(topUsageError([a, b])).toBe(a)
	})

	it('is undefined for no errors', () => {
		expect(topUsageError([])).toBeUndefined()
	})
})

describe('describeMissingCommand()', () => {
	it('says when a group has no sub-commands', () => {
		const empty = command({ name: 'empty', commands: [] })
		expect(describeMissingCommand(empty, 'app').help).toEqual([
			'Usage: app empty',
			'`app empty` has no commands (--help always allowed)'
		])
	})
})

describe('describeInvalidConfig()', () => {
	it('keys the messages by the config key, and moves a reserved key under config.', () => {
		expect(describeInvalidConfig({ port: ['bad'], code: ['worse'], help: undefined })).toEqual({
			message: 'config fails validation',
			code: 'invalid-config',
			details: { port: ['bad'], 'config.code': ['worse'] },
			help: []
		})
	})
})
