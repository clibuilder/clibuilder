import { testType } from 'type-plus'
import { command, z } from './index.js'

test('when no argument and options, args will have help', () => {
	command({
		name: 'cmd',
		run(args) {
			testType.equal<typeof args.help, boolean | undefined>(true)
		}
	})
})

test('command can override help', () => {
	command({
		name: 'cmd',
		options: { help: { description: 'help with topic', type: z.string() } },
		run(args) {
			testType.equal<typeof args.help, string>(true)
		}
	})
})

test('argument with defined type', () => {
	command({
		name: 'cmd',
		arguments: [{ name: 'arg1', description: 'desc', type: z.number() }],
		run(args) {
			testType.equal<typeof args.arg1, number>(true)
		}
	})
})

test('argument type defaults to string', () => {
	command({
		name: 'cmd',
		arguments: [{ name: 'arg1', description: 'desc' }],
		run(args) {
			testType.equal<typeof args.arg1, string>(true)
		}
	})
})

test('argument of number array', () => {
	command({
		name: 'cmd',
		arguments: [{ name: 'arg1', description: 'desc', type: z.array(z.number()) }],
		run(args) {
			testType.equal<typeof args.arg1, number[]>(true)
		}
	})
})

test('multiple arguments with omitted type', () => {
	command({
		name: 'cmd',
		arguments: [
			{ name: 'arg1', description: 'desc' },
			{ name: 'arg2', description: 'desc', type: z.boolean() }
		],
		run(args) {
			testType.equal<typeof args.arg1, string>(true)
			testType.equal<typeof args.arg2, boolean>(true)
		}
	})
})

test('option type defaults to boolean', () => {
	command({
		name: 'cmd',
		options: {
			abc: { description: 'abc' }
		},
		run(args) {
			testType.equal<typeof args.abc, boolean | undefined>(true)
		}
	})
})

test('options with type', () => {
	command({
		name: 'cmd',
		options: {
			abc: { description: 'abc', type: z.array(z.string()) }
		},
		run(args) {
			testType.equal<typeof args.abc, string[]>(true)
		}
	})
})

test('multiple options with omitted type', () => {
	command({
		name: 'cmd',
		options: {
			abc: { description: 'abc', type: z.array(z.string()) },
			def: { description: 'abc' }
		},
		run(args) {
			testType.equal<typeof args.abc, string[]>(true)
			testType.equal<typeof args.def, boolean | undefined>(true)
		}
	})
})

test('with arguments and options', () => {
	command({
		name: 'cmd',
		arguments: [
			{ name: 'arg1', description: 'desc' },
			{ name: 'arg2', description: 'desc', type: z.boolean() }
		],
		options: {
			abc: { description: 'abc', type: z.array(z.string()) },
			def: { description: 'abc' }
		},
		run(args) {
			testType.equal<typeof args.arg1, string>(true)
			testType.equal<typeof args.arg2, boolean>(true)
			testType.equal<typeof args.abc, string[]>(true)
			testType.equal<typeof args.def, boolean | undefined>(true)
		}
	})
})

test('options with optional type', () => {
	command({
		name: 'cmd',
		options: {
			abc: { description: 'abc', type: z.optional(z.string()) }
		},
		run(args) {
			testType.equal<typeof args.abc, string | undefined>(true)
		}
	})
})

it('pass array default values options to the run function', () => {
	command({
		name: 'cmd',
		options: {
			arrayValues: { description: 'desc', type: z.array(z.string()), default: ['a', 'b'] }
		},
		run({ arrayValues }) {
			testType.equal<typeof arrayValues, string[]>(true)
			expect(arrayValues).toEqual(['a', 'b'])
		}
	})
})
