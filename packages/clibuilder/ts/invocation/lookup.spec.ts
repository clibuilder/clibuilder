import { a } from 'assertron'
import { getBaseCommand } from '../builtin/base_command.js'
import { type cli, command, parseArgv, z } from '../index.js'
import { argv } from '../test-utils/index.js'
import { lookupCommand } from './lookup.js'

function testLookupCommand(command: cli.Command, args: string) {
	const r = lookupCommand(command, parseArgv(argv(args)))
	return r ? { cmd: r.command, args: r.args, errors: r.errors } : r
}

describe('with default command', () => {
	test('no args gets the default command', () => {
		const defaultCommand = { name: '', run() {} }
		const { cmd, args } = testLookupCommand(defaultCommand, 'my-cli')!
		expect(cmd).toBe(defaultCommand)
		expect(args).toEqual({ _: [] })
	})
	test('default command with --help gets default command', () => {
		const defaultCommand = command({
			name: '',
			options: {
				help: { type: z.boolean(), description: 'x' }
			},
			run() {}
		})
		const { cmd, args } = testLookupCommand(defaultCommand, 'my-cli --help')!
		expect(cmd).toBe(defaultCommand)
		expect(args).toEqual({ _: [], help: true })
	})
	test('with one argument', () => {
		const defaultCommand = command({
			name: '',
			arguments: [{ name: 'arg', type: z.string(), description: 'some arg' }],
			run() {}
		})
		const { cmd, args } = testLookupCommand(defaultCommand, 'my-cli abc')!
		expect(cmd).toBe(defaultCommand)
		expect(args).toEqual({ _: [], arg: 'abc' })
	})
})
describe('command aliases', () => {
	test('resolves a nested command by its alias', () => {
		const listCommand = command({ name: 'list', alias: ['ls'], run() {} })
		const pluginsCommand = command({ name: 'plugins', commands: [listCommand] })
		const rootCommand = command({ name: '', commands: [pluginsCommand] })

		const { cmd, args, errors } = testLookupCommand(rootCommand, 'my-cli plugins ls')!

		expect(cmd).toBe(listCommand)
		expect(args).toEqual({ _: [] })
		expect(errors).toEqual([])
	})
})
describe('argument', () => {
	test('argument can be optional', () => {
		const defaultCommand = command({
			name: '',
			arguments: [{ name: 'arg', type: z.string().optional(), description: 'some arg' }],
			run() {}
		})
		const { cmd, args, errors } = testLookupCommand(defaultCommand, 'my-cli')!
		expect(cmd).toBe(defaultCommand)
		expect(args).toEqual({ _: [] })
		expect(errors).toEqual([])
	})
	test('required argument', () => {
		const defaultCommand = command({
			name: '',
			arguments: [{ name: 'arg', type: z.string(), description: 'some required arg' }],
			run() {}
		})
		const { cmd, args, errors } = testLookupCommand(defaultCommand, 'my-cli')!
		expect(cmd).toBe(defaultCommand)
		expect(args).toEqual({ _: [] })
		expect(errors).toEqual([{ type: 'missing-argument', name: 'arg' }])
	})
	test('argument without a type is a string', () => {
		const defaultCommand = command({
			name: '',
			arguments: [{ name: 'arg', description: 'some arg' }],
			run() {}
		})
		const { args, errors } = testLookupCommand(defaultCommand, 'my-cli 123')!
		expect(args).toEqual({ _: [], arg: '123' })
		expect(errors).toEqual([])
	})
	test('number argument is coerced to a number', () => {
		const defaultCommand = command({
			name: '',
			arguments: [{ name: 'arg', type: z.number(), description: 'some arg' }],
			run() {}
		})
		const { args, errors } = testLookupCommand(defaultCommand, 'my-cli 42')!
		expect(args).toEqual({ _: [], arg: 42 })
		expect(errors).toEqual([])
	})
	test('boolean argument is coerced to a boolean', () => {
		const defaultCommand = command({
			name: '',
			arguments: [{ name: 'arg', type: z.boolean(), description: 'some arg' }],
			run() {}
		})
		const { args, errors } = testLookupCommand(defaultCommand, 'my-cli false')!
		expect(args).toEqual({ _: [], arg: false })
		expect(errors).toEqual([])
	})
	test('a number argument that is not a number reports invalid-value', () => {
		const defaultCommand = command({
			name: '',
			arguments: [{ name: 'arg', type: z.number(), description: 'some arg' }],
			run() {}
		})
		const { args, errors } = testLookupCommand(defaultCommand, 'my-cli xyz')!
		expect(args).toEqual({ _: [], arg: undefined })
		a.satisfies(errors, [{ type: 'invalid-value', key: 'arg', value: 'xyz' }])
	})
	test('number array argument is variadic and coerced', () => {
		const defaultCommand = command({
			name: '',
			arguments: [{ name: 'values', type: z.array(z.number()), description: 'some args' }],
			run() {}
		})
		const { args, errors } = testLookupCommand(defaultCommand, 'my-cli 1 2 3')!
		expect(args).toEqual({ _: [], values: [1, 2, 3] })
		expect(errors).toEqual([])
	})
	test('string array argument is variadic', () => {
		const defaultCommand = command({
			name: '',
			arguments: [{ name: 'values', type: z.array(z.string()), description: 'some args' }],
			run() {}
		})
		const { args, errors } = testLookupCommand(defaultCommand, 'my-cli abc def')!
		expect(args).toEqual({ _: [], values: ['abc', 'def'] })
		expect(errors).toEqual([])
	})
	test('boolean array argument is variadic and coerced', () => {
		const defaultCommand = command({
			name: '',
			arguments: [{ name: 'values', type: z.array(z.boolean()), description: 'some args' }],
			run() {}
		})
		const { args, errors } = testLookupCommand(defaultCommand, 'my-cli true false')!
		expect(args).toEqual({ _: [], values: [true, false] })
		expect(errors).toEqual([])
	})
	test('optional array argument is coerced', () => {
		const defaultCommand = command({
			name: '',
			arguments: [{ name: 'values', type: z.optional(z.array(z.number())), description: 'some args' }],
			run() {}
		})
		const { args, errors } = testLookupCommand(defaultCommand, 'my-cli 1 2')!
		expect(args).toEqual({ _: [], values: [1, 2] })
		expect(errors).toEqual([])
	})
	test('an argument type without a string conversion is validated by the schema itself', () => {
		const defaultCommand = command({
			name: '',
			arguments: [{ name: 'arg', type: z.enum(['abc', 'def']), description: 'some arg' }],
			run() {}
		})
		expect(testLookupCommand(defaultCommand, 'my-cli abc')!.args).toEqual({ _: [], arg: 'abc' })
		expect(testLookupCommand(defaultCommand, 'my-cli xyz')!.args).toEqual({ _: [], arg: undefined })
	})
})
describe('option without a declared type', () => {
	test('is a boolean when present', () => {
		const defaultCommand = command({
			name: '',
			options: { f: { description: 'f' } },
			run() {}
		})
		const { args, errors } = testLookupCommand(defaultCommand, 'my-cli --f')!
		expect(args).toEqual({ _: [], f: true })
		expect(errors).toEqual([])
	})
	test('bundled short flags are booleans', () => {
		const defaultCommand = command({
			name: '',
			options: { a: { description: 'a' }, b: { description: 'b' } },
			run() {}
		})
		const { args, errors } = testLookupCommand(defaultCommand, 'my-cli -ab')!
		expect(args).toEqual({ _: [], a: true, b: true })
		expect(errors).toEqual([])
	})
	test('accepts an explicit false', () => {
		const defaultCommand = command({
			name: '',
			options: { f: { description: 'f' } },
			run() {}
		})
		const { args, errors } = testLookupCommand(defaultCommand, 'my-cli --f=false')!
		expect(args).toEqual({ _: [], f: false })
		expect(errors).toEqual([])
	})
	test('a non-boolean value reports invalid-value', () => {
		const defaultCommand = command({
			name: '',
			options: { f: { description: 'f' } },
			run() {}
		})
		const { args, errors } = testLookupCommand(defaultCommand, 'my-cli --f=somevalue')!
		expect(args).toEqual({ _: [], f: undefined })
		a.satisfies(errors, [{ type: 'invalid-value', key: 'f', value: 'somevalue' }])
	})
})
describe('options basic', () => {
	test('---option is invalid', () => {
		const { errors } = testLookupCommand(getBaseCommand(''), 'my-cli ---help')!
		expect(errors).toEqual([{ key: '-help', type: 'invalid-key' }])
	})
})
describe('boolean options', () => {
	test('accepts true/false', () => {
		const { args } = testLookupCommand(getBaseCommand(''), 'my-cli -h false -v true')!
		expect(args).toEqual({ _: [], help: false, version: true })
	})
	test('other strings are invalid', () => {
		const { errors } = testLookupCommand(getBaseCommand(''), 'my-cli -h=x')!
		a.satisfies(errors, [{ type: 'invalid-value', key: 'h', value: 'x' }])
	})
	test('does not take a following token that is not true/false', () => {
		const { args, errors } = testLookupCommand(getBaseCommand(''), 'my-cli -h x')!
		expect(args).toEqual({ _: [], help: true })
		expect(errors).toEqual([{ type: 'extra-arguments', name: '', values: ['x'] }])
	})
	test('boolean options with space syntax', () => {
		const defaultCommand = command({
			name: '',
			options: { abc: { description: 'a', type: z.boolean() } },
			run() {}
		})
		const { cmd, args } = testLookupCommand(defaultCommand, 'my-cli --abc')!
		expect(cmd).toBe(defaultCommand)
		expect(args).toEqual({ _: [], abc: true })
	})
	test('boolean options with = syntax', () => {
		const defaultCommand = command({
			name: '',
			options: { abc: { type: z.boolean(), description: 'a' } },
			run() {}
		})
		const { cmd, args } = testLookupCommand(defaultCommand, 'my-cli --abc=true')!
		expect(cmd).toBe(defaultCommand)
		expect(args).toEqual({ _: [], abc: true })
	})
	test('boolean options with space syntax', () => {
		const defaultCommand = command({
			name: '',
			options: { abc: { type: z.boolean(), description: 'a' } },
			run() {}
		})
		const { cmd, args } = testLookupCommand(defaultCommand, 'my-cli --abc false')!
		expect(cmd).toBe(defaultCommand)
		expect(args).toEqual({ _: [], abc: false })
	})
	test('boolean options with alias', () => {
		const defaultCommand = command({
			name: '',
			options: {
				abc: { type: z.boolean(), description: 'a', alias: ['a'] }
			},
			run() {}
		})
		const { cmd, args } = testLookupCommand(defaultCommand, 'my-cli -a')!
		expect(cmd).toBe(defaultCommand)
		expect(args).toEqual({ _: [], abc: true })
	})
	test('boolean options with default', () => {
		const defaultCommand = command({
			name: '',
			options: {
				abc: { type: z.boolean(), description: 'a', default: true }
			},
			run() {}
		})
		const { cmd, args } = testLookupCommand(defaultCommand, 'my-cli')!
		expect(cmd).toBe(defaultCommand)
		expect(args).toEqual({ _: [], abc: true })
	})
	test('boolean options with default as false', () => {
		const defaultCommand = command({
			name: '',
			options: {
				abc: { type: z.boolean(), description: 'a', default: false }
			},
			run() {}
		})
		const { cmd, args } = testLookupCommand(defaultCommand, 'my-cli')!
		expect(cmd).toBe(defaultCommand)
		expect(args).toEqual({ _: [], abc: false })
	})
	test('boolean array options', () => {
		const defaultCommand = command({
			name: '',
			options: {
				abc: { type: z.array(z.boolean()), description: 'a' }
			},
			run() {}
		})
		const { cmd, args } = testLookupCommand(defaultCommand, 'my-cli --abc=true --abc=true')!
		expect(cmd).toBe(defaultCommand)
		expect(args).toEqual({ _: [], abc: [true, true] })
	})
	test('boolean options pass in multiple values gets the last value and emit warning', () => {
		const defaultCommand = command({
			name: '',
			options: { abc: { type: z.boolean(), description: 'a' } },
			run() {}
		})
		const { cmd, args, errors } = testLookupCommand(defaultCommand, 'my-cli --abc=false --abc=true')!
		expect(cmd).toBe(defaultCommand)
		expect(args).toEqual({ _: [], abc: true })
		a.satisfies(errors, [{ type: 'expect-single', key: 'abc', value: ['false', 'true'] }])
	})
	test('boolean options with multiple pass in single values gets array', () => {
		const defaultCommand = command({
			name: '',
			options: {
				abc: { type: z.array(z.boolean()), description: 'a' }
			},
			run() {}
		})
		const { cmd, args } = testLookupCommand(defaultCommand, 'my-cli --abc=true')!
		expect(cmd).toBe(defaultCommand)
		expect(args).toEqual({ _: [], abc: [true] })
	})
})
describe('numeric options', () => {
	test('number options with = syntax', () => {
		const defaultCommand = command({
			name: '',
			options: { abc: { type: z.number(), description: 'a' } },
			run() {}
		})
		const { cmd, args } = testLookupCommand(defaultCommand, 'my-cli --abc=123')!
		expect(cmd).toBe(defaultCommand)
		expect(args).toEqual({ _: [], abc: 123 })
	})
	test('number options with space syntax', () => {
		const defaultCommand = command({
			name: '',
			options: { abc: { type: z.number(), description: 'a' } },
			run() {}
		})
		const { cmd, args } = testLookupCommand(defaultCommand, 'my-cli --abc 123')!
		expect(cmd).toBe(defaultCommand)
		expect(args).toEqual({ _: [], abc: 123 })
	})
	test('number options with alias', () => {
		const defaultCommand = command({
			name: '',
			options: {
				abc: { type: z.number(), description: 'a', alias: ['a'] }
			},
			run() {}
		})
		const { cmd, args } = testLookupCommand(defaultCommand, 'my-cli -a=123')!
		expect(cmd).toBe(defaultCommand)
		expect(args).toEqual({ _: [], abc: 123 })
	})
	test('number options with default', () => {
		const defaultCommand = command({
			name: '',
			options: {
				abc: { type: z.number(), default: 123, description: 'a' }
			},
			run() {}
		})
		const { cmd, args } = testLookupCommand(defaultCommand, 'my-cli')!
		expect(cmd).toBe(defaultCommand)
		expect(args).toEqual({ _: [], abc: 123 })
	})
	test('singular options pass in multiple values gets the last value and emit warning', () => {
		const defaultCommand = command({
			name: '',
			options: { abc: { type: z.number(), description: 'a' } },
			run() {}
		})
		const { cmd, args, errors } = testLookupCommand(defaultCommand, 'my-cli --abc=2 --abc=3')!
		expect(cmd).toBe(defaultCommand)
		expect(args).toEqual({ _: [], abc: 3 })
		a.satisfies(errors, [{ type: 'expect-single', key: 'abc', value: ['2', '3'] }])
	})
	test('number array options', () => {
		const defaultCommand = command({
			name: '',
			options: {
				abc: { type: z.array(z.number()), description: 'a' }
			},
			run() {}
		})
		const { cmd, args } = testLookupCommand(defaultCommand, 'my-cli --abc=2 --abc=3')!
		expect(cmd).toBe(defaultCommand)
		expect(args).toEqual({ _: [], abc: [2, 3] })
	})
	test('number options with invalid value', () => {
		const defaultCommand = command({
			name: '',
			options: { abc: { type: z.number(), description: 'a' } },
			run() {}
		})
		const { cmd, errors } = testLookupCommand(defaultCommand, 'my-cli --abc=xyz')!
		expect(cmd).toBe(defaultCommand)
		expect(errors).toEqual([
			{
				key: 'abc',
				message: 'expected to be number',
				type: 'invalid-value',
				value: 'xyz'
			}
		])
	})
})
describe('string options', () => {
	test('string options with = syntax', () => {
		const defaultCommand = command({
			name: '',
			options: { abc: { type: z.string(), description: 'a' } },
			run() {}
		})
		const { cmd, args } = testLookupCommand(defaultCommand, 'my-cli --abc=123')!
		expect(cmd).toBe(defaultCommand)
		expect(args).toEqual({ _: [], abc: '123' })
	})
	test('string options with space syntax', () => {
		const defaultCommand = command({
			name: '',
			options: { abc: { type: z.string(), description: 'a' } },
			run() {}
		})
		const { cmd, args } = testLookupCommand(defaultCommand, 'my-cli --abc 123')!
		expect(cmd).toBe(defaultCommand)
		expect(args).toEqual({ _: [], abc: '123' })
	})
	test('string options with alias', () => {
		const defaultCommand = command({
			name: '',
			options: {
				abc: { type: z.string(), description: 'a', alias: ['a'] }
			},
			run() {}
		})
		const { cmd, args } = testLookupCommand(defaultCommand, 'my-cli -a=123')!
		expect(cmd).toBe(defaultCommand)
		expect(args).toEqual({ _: [], abc: '123' })
	})
	test('string options with default', () => {
		const defaultCommand = command({
			name: '',
			options: {
				abc: { type: z.string(), default: '123', description: 'a' }
			},
			run() {}
		})
		const { cmd, args } = testLookupCommand(defaultCommand, 'my-cli')!
		expect(cmd).toBe(defaultCommand)
		expect(args).toEqual({ _: [], abc: '123' })
	})
	test('string array options', () => {
		const defaultCommand = command({
			name: '',
			options: {
				abc: { type: z.array(z.string()), description: 'a' }
			},
			run() {}
		})
		const { cmd, args } = testLookupCommand(defaultCommand, 'my-cli --abc=2 --abc=3')!
		expect(cmd).toBe(defaultCommand)
		expect(args).toEqual({ _: [], abc: ['2', '3'] })
	})
	test('a value the schema rejects reports invalid-value with what the schema said', () => {
		const defaultCommand = command({
			name: '',
			options: { abc: { type: z.string().email(), description: 'a' } },
			run() {}
		})
		const { args, errors } = testLookupCommand(defaultCommand, 'my-cli --abc=not-an-email')!
		expect(args).toEqual({ _: [], abc: undefined })
		a.satisfies(errors, [{ type: 'invalid-value', key: 'abc', value: 'not-an-email', message: 'Invalid email' }])
	})
})

describe('enum options', () => {
	const defaultCommand = command({
		name: '',
		options: { fmt: { type: z.optional(z.enum(['toon', 'json'])), default: 'toon' as const, description: 'a' } },
		run() {}
	})

	test('accepts a declared value', () => {
		const { args, errors } = testLookupCommand(defaultCommand, 'my-cli --fmt=json')!
		expect(args).toEqual({ _: [], fmt: 'json' })
		expect(errors).toEqual([])
	})

	// silently falling back to the default here would hand the caller output rendered in a
	// format they did not ask for, and no way to tell that is what happened.
	test('a value outside the enum reports invalid-value instead of taking the default', () => {
		const { args, errors } = testLookupCommand(defaultCommand, 'my-cli --fmt=yaml')!
		a.satisfies(errors, [{ type: 'invalid-value', key: 'fmt', value: 'yaml', message: 'expected one of: toon, json' }])
		// the default still fills the slot, but the error is what the caller acts on:
		// `builder` reports it and exits before the command ever reads the value.
		expect(args).toEqual({ _: [], fmt: 'toon' })
	})
})

describe('option arity', () => {
	const readCommand = command({
		name: 'read',
		arguments: [{ name: 'pane', description: 'pane', type: z.optional(z.string()) }],
		options: {
			lines: { description: 'lines', type: z.optional(z.number()) },
			name: { description: 'name', type: z.optional(z.string()) },
			fmt: { description: 'fmt', type: z.optional(z.enum(['toon', 'json'])) },
			env: { description: 'env', type: z.optional(z.array(z.string())) },
			full: { description: 'full' }
		},
		run() {}
	})
	const root = command({ name: '', commands: [readCommand], run() {} })

	test('a number option takes one following token, the rest are positionals', () => {
		const { cmd, args, errors } = testLookupCommand(root, 'my-cli read --lines 5 %1')
		expect(cmd).toBe(readCommand)
		expect(args).toEqual({ _: [], pane: '%1', lines: 5 })
		expect(errors).toEqual([])
	})
	test('a string option takes one following token', () => {
		const { args, errors } = testLookupCommand(root, 'my-cli read --name x %1')
		expect(args).toEqual({ _: [], pane: '%1', name: 'x' })
		expect(errors).toEqual([])
	})
	test('an enum option takes one following token', () => {
		const { args, errors } = testLookupCommand(root, 'my-cli read --fmt json %1')
		expect(args).toEqual({ _: [], pane: '%1', fmt: 'json' })
		expect(errors).toEqual([])
	})
	test('a scalar option with an inline value takes no following token', () => {
		const { args, errors } = testLookupCommand(root, 'my-cli read --lines=5 %1')
		expect(args).toEqual({ _: [], pane: '%1', lines: 5 })
		expect(errors).toEqual([])
	})
	test('a boolean option takes no following token', () => {
		const { args, errors } = testLookupCommand(root, 'my-cli read --full %1')
		expect(args).toEqual({ _: [], pane: '%1', full: true })
		expect(errors).toEqual([])
	})
	test('a boolean option takes a following true/false', () => {
		const { args, errors } = testLookupCommand(root, 'my-cli read --full false %1')
		expect(args).toEqual({ _: [], pane: '%1', full: false })
		expect(errors).toEqual([])
	})
	test('a boolean option with an inline value takes no following token', () => {
		const { args, errors } = testLookupCommand(root, 'my-cli read --full=false true')
		expect(args).toEqual({ _: [], pane: 'true', full: false })
		expect(errors).toEqual([])
	})
	test('a bundled short flag leaves the following token to the last flag', () => {
		const cmd = command({
			name: '',
			arguments: [{ name: 'pane', description: 'pane' }],
			options: { a: { description: 'a' }, b: { description: 'b' } },
			run() {}
		})
		const { args, errors } = testLookupCommand(cmd, 'my-cli -ab %1')
		expect(args).toEqual({ _: [], pane: '%1', a: true, b: true })
		expect(errors).toEqual([])
	})
	test('an array option keeps collecting following tokens', () => {
		const { args, errors } = testLookupCommand(root, 'my-cli read --env A=1 B=2 --env C=3')
		expect(args).toEqual({ _: [], env: ['A=1', 'B=2', 'C=3'] })
		expect(errors).toEqual([])
	})
	test('positionals keep their order across options', () => {
		const cmd = command({
			name: '',
			arguments: [{ name: 'rest', description: 'rest', type: z.array(z.string()) }],
			options: { lines: { description: 'lines', type: z.number() }, full: { description: 'full' } },
			run() {}
		})
		const { args, errors } = testLookupCommand(cmd, 'my-cli a --lines 5 b --full c --lines 6 d')
		expect(args).toEqual({ _: [], rest: ['a', 'b', 'c', 'd'], lines: 6, full: true })
		a.satisfies(errors, [{ type: 'expect-single', key: 'lines', value: ['5', '6'] }])
	})
	test('extra tokens after a scalar option are reported as extra arguments', () => {
		const { args, errors } = testLookupCommand(root, 'my-cli read --lines 5 %1 %2')
		expect(args).toEqual({ _: [], pane: '%1', lines: 5 })
		expect(errors).toEqual([{ type: 'extra-arguments', name: 'read', values: ['%2'] }])
	})
	test('an unknown option keeps its following tokens', () => {
		const { errors } = testLookupCommand(root, 'my-cli read --unknown x')
		expect(errors).toEqual([{ type: 'invalid-key', key: 'unknown' }])
	})
	test('a fallback command resolves the arity of options the command does not declare', () => {
		const base = getBaseCommand('')
		const r = lookupCommand(root, parseArgv(argv('my-cli read --verbose %1')), base)
		expect(r.args).toEqual({ _: [], pane: '%1' })
		expect(r.errors).toEqual([{ type: 'invalid-key', key: 'verbose' }])
	})
})

describe('conflicting options', () => {
	const defaultCommand = command({
		name: '',
		options: {
			full: { description: 'full output', alias: ['f'], conflicts: ['lines'] },
			lines: { description: 'line count', type: z.optional(z.number()), alias: ['n'], default: 10 }
		},
		run() {}
	})

	test('passing one of them is fine', () => {
		const { errors } = testLookupCommand(defaultCommand, 'my-cli --full')!
		expect(errors).toEqual([])
	})

	test('a default value does not count as passed', () => {
		const { args, errors } = testLookupCommand(defaultCommand, 'my-cli --full')!
		expect(args).toEqual({ _: [], full: true, lines: 10 })
		expect(errors).toEqual([])
	})

	test('passing both reports conflicting-options', () => {
		const { errors } = testLookupCommand(defaultCommand, 'my-cli --full --lines=3')!
		expect(errors).toEqual([{ type: 'conflicting-options', key: 'full', conflictsWith: 'lines' }])
	})

	test('the conflict is reported from either side, once', () => {
		const { errors } = testLookupCommand(defaultCommand, 'my-cli --lines=3 --full')!
		expect(errors).toEqual([{ type: 'conflicting-options', key: 'full', conflictsWith: 'lines' }])
	})

	test('works through aliases, naming the keys as typed', () => {
		const { errors } = testLookupCommand(defaultCommand, 'my-cli -f -n 3')!
		expect(errors).toEqual([{ type: 'conflicting-options', key: 'f', conflictsWith: 'n' }])
	})

	test('a pair declared on both sides is reported once', () => {
		const cmd = command({
			name: '',
			options: {
				env: { description: 'env', type: z.optional(z.string()), conflicts: ['template'] },
				template: { description: 'template', type: z.optional(z.string()), conflicts: ['env'] }
			},
			run() {}
		})
		const { errors } = testLookupCommand(cmd, 'my-cli --env=a --template=b')!
		expect(errors).toEqual([{ type: 'conflicting-options', key: 'env', conflictsWith: 'template' }])
	})
})
