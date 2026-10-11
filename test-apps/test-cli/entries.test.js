// CommonJS: a `t` descriptor made by one clibuilder entry point is accepted by the others.
const assert = require('node:assert/strict')
const test = require('node:test')
const { cli, t } = require('clibuilder')
const { fullOption } = require('clibuilder/axi')
const { testCommand } = require('clibuilder/testing')

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
