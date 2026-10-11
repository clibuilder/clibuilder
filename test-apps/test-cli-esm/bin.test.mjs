import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const bin = fileURLToPath(new URL('./bin.mjs', import.meta.url))
const cwd = fileURLToPath(new URL('.', import.meta.url))

/**
 * Runs the real bin in its own process, as a user would.
 */
function run(...args) {
	const r = spawnSync(process.execPath, [bin, ...args], {
		cwd,
		encoding: 'utf8',
		env: { ...process.env, NO_COLOR: '1', FORCE_COLOR: undefined }
	})
	return { code: r.status, stdout: r.stdout.trim(), stderr: r.stderr.trim() }
}

test('the default command writes error to stderr and info to stdout', () => {
	assert.deepEqual(run(), { code: 0, stdout: 'some info message', stderr: 'some error message' })
})

test('--version prints the version', () => {
	assert.deepEqual(run('--version'), { code: 0, stdout: '1.0.0', stderr: '' })
})

test('--help lists the commands, then the plugins group and the plugin command that plugins() adds', () => {
	const r = run('--help')
	assert.equal(r.code, 0)
	assert.match(r.stdout, /Usage: test-cli <command>/)
	assert.match(r.stdout, /echo, config-value, plugins, one/)
})

test('echo echoes its argument', () => {
	assert.deepEqual(run('echo', 'hi'), { code: 0, stdout: 'echoing: hi', stderr: '' })
})

test('config-value reads the config, which config: true loads for the commands', () => {
	assert.deepEqual(run('config-value', 'greeting'), { code: 0, stdout: 'greeting: hello', stderr: '' })
})

test('runs the command of the plugin the config names', () => {
	// esm-plugin logs `echo` alone
	assert.deepEqual(run('one', 'echo', 'hello'), { code: 0, stdout: 'echo', stderr: '' })
})

test('plugins list finds the installed plugin carrying the test-cli keyword', () => {
	const r = run('plugins', 'list', '--format', 'json')
	assert.equal(r.code, 0)
	assert.deepEqual(JSON.parse(r.stdout), { plugins: ['esm-plugin'] })
})

test('plugins search is reachable', () => {
	const r = run('plugins', 'search', '--help')
	assert.equal(r.code, 0)
	assert.match(r.stdout, /Usage: test-cli plugins search/)
})

test('an unknown command is a usage error', () => {
	const r = run('no-such-command')
	assert.equal(r.code, 2)
	assert.match(r.stdout + r.stderr, /no-such-command/)
})
