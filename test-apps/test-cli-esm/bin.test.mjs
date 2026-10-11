import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import test from 'node:test'

const bin = new URL('./bin.mjs', import.meta.url).pathname
const cwd = new URL('.', import.meta.url).pathname

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

test('--help lists the commands, including the keywords-enabled plugins group', () => {
	const r = run('--help')
	assert.equal(r.code, 0)
	assert.match(r.stdout, /Usage: test-cli <command>/)
	assert.match(r.stdout, /plugins, echo, config-value/)
})

test('echo echoes its argument', () => {
	assert.deepEqual(run('echo', 'hi'), { code: 0, stdout: 'echoing: hi', stderr: '' })
})

test('config-value reports that the cli declares no config', () => {
	assert.deepEqual(run('config-value', 'some-value'), {
		code: 1,
		stdout: '',
		stderr: "cannot read 'some-value': test-cli declares no config"
	})
})

test('plugins list finds no plugin installed for the test-cli keyword', () => {
	const r = run('plugins', 'list', '--format', 'json')
	assert.equal(r.code, 0)
	assert.deepEqual(JSON.parse(r.stdout), { plugins: [] })
})

test('an unknown command is a usage error', () => {
	const r = run('no-such-command')
	assert.equal(r.code, 2)
	assert.match(r.stdout + r.stderr, /no-such-command/)
})
