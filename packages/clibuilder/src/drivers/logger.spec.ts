import { command, z } from '../index.js'
import { createStreamUI } from './stream_ui.js'

describe('showVersion', () => {
	test('undefined version shows "not versioned"', () => {
		const { ui, messages } = testUI()
		ui.showVersion()
		expect(messages()).toEqual('not versioned')
	})
	test('empty version shows "not versioned"', () => {
		const { ui, messages } = testUI()
		ui.showVersion('')
		expect(messages()).toEqual('not versioned')
	})
})

describe('showHelp()', () => {
	test('command with alias', () => {
		const { ui, messages } = testUI()
		ui.showHelp(
			'cli',
			command({
				name: 'search-package',
				alias: ['sp'],
				run() {}
			})
		)
		expect(messages()).toEqual(`
Usage: cli search-package

Alias:
  sp
`)
	})
	test('with sub-commands', () => {
		const { ui, messages } = testUI()
		ui.showHelp(
			'cli',
			command({
				name: 'cmd',
				commands: [
					command({
						name: 'sub',
						run() {}
					})
				]
			})
		)
		expect(messages()).toEqual(`
Usage: cli cmd <command>

Commands:
  sub

cmd <command> -h         Get help for <command>
`)
	})
	test('sub command with alias', () => {
		const { ui, messages } = testUI()
		ui.showHelp(
			'cli',
			command({
				name: 'repo',
				commands: [
					{
						name: 'search-package',
						alias: ['sp'],
						run() {}
					}
				]
			})
		)
		expect(messages()).toEqual(`
Usage: cli repo <command>

Commands:
  search-package (sp)

repo <command> -h        Get help for <command>
`)
	})
	describe('arguments', () => {
		test('untyped argument is required', () => {
			const { ui, messages } = testUI()
			ui.showHelp(
				'cli',
				command({
					name: 'cmd',
					arguments: [{ name: 'x', description: '' }],
					run() {}
				})
			)
			expect(messages()).toEqual(`
Usage: cli cmd <arguments>

Arguments:
  <x>
`)
		})
		test('required argument', () => {
			const { ui, messages } = testUI()
			ui.showHelp(
				'cli',
				command({
					name: 'cmd',
					arguments: [{ name: 'x', description: '', type: z.string() }],
					run() {}
				})
			)
			expect(messages()).toEqual(`
Usage: cli cmd <arguments>

Arguments:
  <x=string>
`)
		})
		test('optional argument', () => {
			const { ui, messages } = testUI()
			ui.showHelp(
				'cli',
				command({
					name: 'cmd',
					arguments: [{ name: 'x', description: '', type: z.optional(z.string()) }],
					run() {}
				})
			)
			expect(messages()).toEqual(`
Usage: cli cmd [arguments]

Arguments:
  [x=string]
`)
		})
		test('variadic argument', () => {
			const { ui, messages } = testUI()
			ui.showHelp(
				'cli',
				command({
					name: 'cmd',
					arguments: [{ name: 'x', description: '', type: z.array(z.string()) }],
					run() {}
				})
			)
			expect(messages()).toEqual(`
Usage: cli cmd <arguments>

Arguments:
  <x=string...>
`)
		})
		test('optional variadic argument', () => {
			const { ui, messages } = testUI()
			ui.showHelp(
				'cli',
				command({
					name: 'cmd',
					arguments: [{ name: 'x', description: '', type: z.optional(z.array(z.number())) }],
					run() {}
				})
			)
			expect(messages()).toEqual(`
Usage: cli cmd [arguments]

Arguments:
  [x=number...]
`)
		})
		test('boolean argument shows its type', () => {
			const { ui, messages } = testUI()
			ui.showHelp(
				'cli',
				command({
					name: 'cmd',
					arguments: [{ name: 'x', description: '', type: z.boolean() }],
					run() {}
				})
			)
			expect(messages()).toEqual(`
Usage: cli cmd <arguments>

Arguments:
  <x=boolean>
`)
		})
		test('required, optional, and variadic arguments together', () => {
			const { ui, messages } = testUI()
			ui.showHelp(
				'cli',
				command({
					name: 'cmd',
					arguments: [
						{ name: 'src', description: 'the source', type: z.string() },
						{ name: 'host', description: 'the host', type: z.optional(z.string()) },
						{ name: 'files', description: 'the files', type: z.array(z.string()) }
					],
					run() {}
				})
			)
			expect(messages()).toEqual(`
Usage: cli cmd <arguments>

Arguments:
  <src=string>           the source
  [host=string]          the host
  <files=string...>      the files
`)
		})
	})
	describe('options', () => {
		test('default (optional boolean)', () => {
			const { ui, messages } = testUI()
			ui.showHelp(
				'cli',
				command({
					name: 'cmd',
					options: {
						abc: { description: 'desc' }
					},
					run() {}
				})
			)
			expect(messages()).toEqual(`
Usage: cli cmd [options]

Options:
  [--abc]                desc
`)
		})
		test('required string', () => {
			const { ui, messages } = testUI()
			ui.showHelp(
				'cli',
				command({
					name: 'cmd',
					options: {
						abc: { description: 'desc', type: z.string() }
					},
					run() {}
				})
			)
			expect(messages()).toEqual(`
Usage: cli cmd <options>

Options:
  <--abc=string>         desc
`)
		})
		test('required number', () => {
			const { ui, messages } = testUI()
			ui.showHelp(
				'cli',
				command({
					name: 'cmd',
					options: {
						abc: { description: 'desc', type: z.number() }
					},
					run() {}
				})
			)
			expect(messages()).toEqual(`
Usage: cli cmd <options>

Options:
  <--abc=number>         desc
`)
		})
		test('required boolean', () => {
			const { ui, messages } = testUI()
			ui.showHelp(
				'cli',
				command({
					name: 'cmd',
					options: {
						abc: { description: 'desc', type: z.boolean() }
					},
					run() {}
				})
			)
			expect(messages()).toEqual(`
Usage: cli cmd <options>

Options:
  <--abc>                desc
`)
		})
		test('required string array', () => {
			const { ui, messages } = testUI()
			ui.showHelp(
				'cli',
				command({
					name: 'cmd',
					options: {
						abc: { description: 'desc', type: z.array(z.string()) }
					},
					run() {}
				})
			)
			expect(messages()).toEqual(`
Usage: cli cmd <options>

Options:
  <--abc=string...>      desc
`)
		})
		test('required number array', () => {
			const { ui, messages } = testUI()
			ui.showHelp(
				'cli',
				command({
					name: 'cmd',
					options: {
						abc: { description: 'desc', type: z.array(z.number()) }
					},
					run() {}
				})
			)
			expect(messages()).toEqual(`
Usage: cli cmd <options>

Options:
  <--abc=number...>      desc
`)
		})
		test('required boolean array', () => {
			const { ui, messages } = testUI()
			ui.showHelp(
				'cli',
				command({
					name: 'cmd',
					options: {
						abc: { description: 'desc', type: z.array(z.boolean()) }
					},
					run() {}
				})
			)
			expect(messages()).toEqual(`
Usage: cli cmd <options>

Options:
  <--abc=boolean...>     desc
`)
		})
		test('with default', () => {
			const { ui, messages } = testUI()
			ui.showHelp(
				'cli',
				command({
					name: 'cmd',
					options: {
						abc: { description: 'desc', type: z.string(), default: 'miku' }
					},
					run() {}
				})
			)
			expect(messages()).toEqual(`
Usage: cli cmd <options>

Options:
  <--abc=string>         desc (default 'miku')
`)
		})
		test('with conflicts', () => {
			const { ui, messages } = testUI()
			ui.showHelp(
				'cli',
				command({
					name: 'cmd',
					options: {
						full: { description: 'full output', conflicts: ['lines'] },
						lines: { description: 'line count', type: z.optional(z.number()), alias: ['n'], default: 10 }
					},
					run() {}
				})
			)
			expect(messages()).toEqual(`
Usage: cli cmd [options]

Options:
  [--full]               full output (conflicts with --lines)
  [-n|--lines=number]    line count (default 10) (conflicts with --full)
`)
		})
		test('options with single string alias', () => {
			const { ui, messages } = testUI()
			ui.showHelp(
				'cli',
				command({
					name: 'cmd',
					options: {
						long: { description: 'description', alias: ['l'] }
					},
					run() {}
				})
			)
			expect(messages()).toEqual(`
Usage: cli cmd [options]

Options:
  [-l|--long]            description
`)
		})
		test('options with hidden alias', () => {
			const { ui, messages } = testUI()
			ui.showHelp(
				'cli',
				command({
					name: 'cmd',
					options: {
						long: {
							type: z.optional(z.string()),
							description: 'description',
							alias: [
								{ alias: 'l', hidden: true },
								{ alias: 'h', hidden: false }
							]
						}
					},
					run() {}
				})
			)
			expect(messages()).toEqual(`
Usage: cli cmd [options]

Options:
  [-h|--long=string]     description
`)
		})
	})

	describe('config', () => {
		test('{ a: string }', () => {
			const { ui, messages } = testUI()
			ui.showHelp(
				'cli',
				command({
					name: 'cmd',
					config: z.object({ a: z.string() }),
					run() {}
				})
			)
			expect(messages()).toEqual(`
Usage: cli cmd

Config:
{ a: string }
`)
		})
		test('{ a: string, b: boolean }', () => {
			const { ui, messages } = testUI()
			ui.showHelp(
				'cli',
				command({
					name: 'cmd',
					config: z.object({ a: z.string(), b: z.boolean() }),
					run() {}
				})
			)
			expect(messages()).toEqual(`
Usage: cli cmd

Config:
{ a: string, b: boolean }
`)
		})
		test('{ c: number }', () => {
			const { ui, messages } = testUI()
			ui.showHelp(
				'cli',
				command({
					name: 'cmd',
					config: z.object({ c: z.number() }),
					run() {}
				})
			)
			expect(messages()).toEqual(`
Usage: cli cmd

Config:
{ c: number }
`)
		})
		test('{ c?: string[] }', () => {
			const { ui, messages } = testUI()
			ui.showHelp(
				'cli',
				command({
					name: 'cmd',
					config: z.object({ c: z.optional(z.array(z.string())) }),
					run() {}
				})
			)
			expect(messages()).toEqual(`
Usage: cli cmd

Config:
{ c?: string[] }
`)
		})
		test('{ a: Array<{ d: string }> }', () => {
			const { ui, messages } = testUI()
			ui.showHelp(
				'cli',
				command({
					name: 'cmd',
					config: z.object({ a: z.array(z.object({ d: z.string() })) }),
					run() {}
				})
			)
			expect(messages()).toEqual(`
Usage: cli cmd

Config:
{ a: Array<{ d: string }> }
`)
		})
		test('{ a?: Array<{ d?: string }> }', () => {
			const { ui, messages } = testUI()
			ui.showHelp(
				'cli',
				command({
					name: 'cmd',
					config: z.object({
						a: z
							.array(
								z.object({
									d: z.string().optional()
								})
							)
							.optional()
					}),
					run() {}
				})
			)
			expect(messages()).toEqual(`
Usage: cli cmd

Config:
{ a?: Array<{ d?: string }> }
`)
		})
	})
})

function testUI() {
	let text = ''
	const sink = { colour: false, write: (t: string) => void (text += t) }
	const ui = createStreamUI({ stdout: sink, stderr: sink }, 'console')
	ui.displayLevel = 'trace'
	return { ui, messages: () => text.replace(/\n$/, '') }
}
