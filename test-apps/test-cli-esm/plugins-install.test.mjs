import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { testCommand } from 'clibuilder/testing'
import { detectPackageManager, pluginsGroup } from './plugins-install.mjs'

/**
 * The `plugins` group, with the package manager and the config lookup of `install` replaced,
 * so no test installs anything or reads the disk.
 */
function setup({ code = 0, source = { type: 'file', path: '/project/test-clirc.json', format: 'jsonc' } } = {}) {
	const calls = []
	const fakes = {
		detectPackageManager: () => 'pnpm',
		runPackageManager: (packageManager, args) => {
			calls.push([packageManager, ...args])
			return Promise.resolve(code)
		},
		findConfig: () => source
	}
	const group = pluginsGroup({ name: 'test-cli', keywords: ['test-cli'] })
	const commands = group.commands.map((c) => (c.name === 'install' ? { ...c, context: { ...c.context, ...fakes } } : c))
	return { calls, group: { ...group, commands } }
}

/**
 * The answer alone. `testCommand()` runs a cli without `plugins()`, which warns about a config
 * that lists plugins, so the warning is dropped here.
 */
function answer(messages) {
	return messages
		.split('\n')
		.filter((line) => !line.startsWith('the config lists plugins'))
		.join('\n')
}

test('the plugins group keeps list and search, and adds install', async () => {
	const { group } = setup()
	assert.deepEqual(
		group.commands.map((c) => c.name),
		['list', 'search', 'install']
	)
})

test('install runs the package manager, then says what to add to the config', async () => {
	const { calls, group } = setup()
	const { messages, exitCode } = await testCommand(group, 'plugins install test-cli-plugin-git@1.2.0', {
		config: { plugins: ['esm-plugin'] }
	})
	assert.equal(exitCode, undefined)
	assert.deepEqual(calls, [['pnpm', 'add', 'test-cli-plugin-git@1.2.0']])
	assert.equal(
		answer(messages),
		[
			'installed: test-cli-plugin-git',
			'packageManager: pnpm',
			'config: /project/test-clirc.json',
			'plugins[2]: esm-plugin,test-cli-plugin-git',
			'help[1]: "Add \\"test-cli-plugin-git\\" to the `plugins` array in /project/test-clirc.json to load it"'
		].join('\n')
	)
})

test('install returns the plugins array to set, for a caller that writes the config itself', async () => {
	const { group } = setup()
	const { result } = await testCommand(group, 'plugins install @acme/test-cli-plugin-deploy', { format: 'json' })
	assert.deepEqual(result.plugins, ['@acme/test-cli-plugin-deploy'])
})

test('install names the package.json property when the config lives there', async () => {
	const { group } = setup({ source: { type: 'package.json', path: '/project/package.json', property: 'test-cli' } })
	const { messages } = await testCommand(group, 'plugins install test-cli-plugin-git')
	assert.match(messages, /Add \\"test-cli-plugin-git\\" to `test-cli.plugins` in \/project\/package.json to load it/)
})

test('install says which file to create when there is no config', async () => {
	const { group } = setup({ source: { type: 'none' } })
	const { result } = await testCommand(group, 'plugins install test-cli-plugin-git', { format: 'json' })
	assert.equal(result.config, 'none, create test-cli.json')
	const { messages } = await testCommand(group, 'plugins install test-cli-plugin-git', { format: 'text' })
	assert.match(messages, /Create test-cli.json holding \{"plugins":\["test-cli-plugin-git"\]\} to load it/)
})

test('install points to plugins list when the config already lists the plugin', async () => {
	const { group } = setup()
	const { messages } = await testCommand(group, 'plugins install esm-plugin', { config: { plugins: ['esm-plugin'] } })
	assert.equal(
		answer(messages),
		[
			'installed: esm-plugin',
			'packageManager: pnpm',
			'config: already lists it',
			'help[1]: Run `test-cli plugins list` to see the installed plugins'
		].join('\n')
	)
})

test('a failed install is an install-failed error', async () => {
	const { group } = setup({ code: 1 })
	const { messages, exitCode } = await testCommand(group, 'plugins install no-such-plugin')
	assert.equal(exitCode, 1)
	assert.match(messages, /^error: pnpm add no-such-plugin failed with exit code 1$/m)
	assert.match(messages, /^code: install-failed$/m)
})

test('a spec that is not a package name is a usage error, and nothing is installed', async () => {
	const { calls, group } = setup()
	const { messages, exitCode } = await testCommand(group, 'plugins install pkg;rm')
	assert.equal(exitCode, 2)
	assert.match(messages, /^code: invalid-value$/m)
	assert.deepEqual(calls, [])
})

test('the package manager is the one whose lockfile is in the project, npm without one', () => {
	const root = mkdtempSync(join(tmpdir(), 'test-cli-pm-'))
	try {
		const project = (lockfile) => {
			const dir = join(root, lockfile ?? 'none')
			mkdirSync(dir)
			if (lockfile) writeFileSync(join(dir, lockfile), '')
			return dir
		}
		assert.equal(detectPackageManager(project('pnpm-lock.yaml')), 'pnpm')
		assert.equal(detectPackageManager(project('yarn.lock')), 'yarn')
		assert.equal(detectPackageManager(project('bun.lock')), 'bun')
		assert.equal(detectPackageManager(project()), 'npm')
	} finally {
		rmSync(root, { recursive: true, force: true })
	}
})
