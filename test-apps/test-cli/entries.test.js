// The packages are ESM-only. This CommonJS file loads every public entry point through require(esm),
// and checks that they share one copy of args-minus:
// a `t` descriptor made by one entry point is accepted by the others.
const assert = require('node:assert/strict')
const test = require('node:test')
const { cli, isDescriptor, t } = require('clibuilder')
const { fullOption } = require('clibuilder/axi')
const { testCommand } = require('clibuilder/testing')

test('a descriptor from clibuilder/axi is a descriptor to clibuilder, and runs through clibuilder/testing', async () => {
	assert.ok(isDescriptor(fullOption.type))
	const r = await testCommand(
		{
			name: 'show',
			options: { full: fullOption },
			run({ full }) {
				return full
			}
		},
		'show --full'
	)
	assert.equal(r.exitCode, undefined)
	assert.equal(r.result, true)
})

test('@clibuilder/plugins and @clibuilder/axi load through require()', () => {
	assert.equal(typeof require('@clibuilder/plugins').plugins, 'function')
	assert.ok(require('@clibuilder/axi').exitCodes)
})

test('testCommand from clibuilder/testing runs a command with a t option', async () => {
	const r = await testCommand(
		{
			name: 'add',
			options: { n: { type: t.int() } },
			run({ n }) {
				return n + 1
			}
		},
		'add --n 2'
	)
	assert.equal(r.exitCode, undefined)
	assert.equal(r.result, 3)
})

test('fullOption from clibuilder/axi works in cli().command()', async () => {
	let full
	await cli({ name: 'app', version: '1.0.0' })
		.command({
			name: 'list',
			options: { full: fullOption },
			run(args) {
				full = args.full
			}
		})
		.parse(['node', 'app', 'list', '--full'])
	assert.equal(process.exitCode ?? 0, 0)
	assert.equal(full, true)
})

test('an ESM host runs a CommonJS plugin that uses require("clibuilder").t', async () => {
	const { testCommand } = await import('clibuilder/testing')
	const commands = []
	require('./t-plugin.js').activate({ addCommand: (c) => commands.push(c) })
	const r = await testCommand(commands[0], 'repeat hi --times 2')
	assert.equal(r.exitCode, undefined)
	assert.equal(r.result, 'hi hi')
})
