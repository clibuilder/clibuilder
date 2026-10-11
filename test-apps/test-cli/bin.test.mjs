import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const bin = fileURLToPath(new URL('./bin.js', import.meta.url))
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

test('the default command writes every ui message to stderr', () => {
	assert.deepEqual(run(), { code: 0, stdout: '', stderr: 'some error message\nsome info message' })
})

test('--version prints the version', () => {
	assert.deepEqual(run('--version'), { code: 0, stdout: '1.0.0', stderr: '' })
})

test('--help lists the commands, then the plugins group and the plugin command that plugins() adds', () => {
	const r = run('--help', '--format', 'text')
	assert.equal(r.code, 0)
	assert.match(r.stdout, /Usage: test-cli <command>/)
	assert.match(r.stdout, /echo, config-value, plugins, one/)
})

test('echo echoes its argument', () => {
	assert.deepEqual(run('echo', 'hi'), { code: 0, stdout: 'echoing: hi', stderr: '' })
})

test('--help answers the structured help in toon by default', () => {
	const r = run('--help')
	assert.equal(r.code, 0)
	assert.equal(r.stderr, '')
	assert.match(r.stdout, /^name: test-cli$/m)
})

test('config-value reads the config, which config: true loads for the commands', () => {
	assert.deepEqual(run('config-value', 'greeting'), { code: 0, stdout: 'greeting: hello', stderr: '' })
})

test('runs the command of the plugin the config names', () => {
	// the plugin says it through ui.info, a diagnostic on stderr, and returns its answer
	assert.deepEqual(run('one', 'echo', 'hello'), { code: 0, stdout: 'hello', stderr: 'echo hello' })
})

test('plugins list finds the installed plugin carrying the test-cli keyword', () => {
	const r = run('plugins', 'list', '--format', 'json')
	assert.equal(r.code, 0)
	assert.deepEqual(JSON.parse(r.stdout), {
		plugins: ['cjs-plugin'],
		help: ['Run `plugins search` to find more plugins on npm']
	})
})

test('plugins search is reachable', () => {
	const r = run('plugins', 'search', '--help', '--format', 'text')
	assert.equal(r.code, 0)
	assert.match(r.stdout, /Usage: test-cli plugins search/)
})

test('an unknown command is a usage error', () => {
	const r = run('no-such-command')
	assert.equal(r.code, 2)
	assert.equal(r.stderr, '')
	assert.match(r.stdout, /no-such-command/)
})

test('a global flag before the command applies, and the command runs', () => {
	// --silent quiets the ui, not the answer
	const r = run('--silent', 'echo', 'hi')
	assert.deepEqual(r, { code: 0, stdout: 'echoing: hi', stderr: '' })
})

test('--help before a group and its sub-command shows the sub-command help', () => {
	const r = run('--help', 'plugins', 'list')
	assert.equal(r.code, 0)
	assert.match(r.stdout, /^name: test-cli plugins list$/m)
})

test('the global --format before the command applies', () => {
	const r = run('--format', 'json', 'plugins', 'list')
	assert.equal(r.code, 0)
	assert.deepEqual(JSON.parse(r.stdout), {
		plugins: ['cjs-plugin'],
		help: ['Run `plugins search` to find more plugins on npm']
	})
})

test("a command's own option before the command stays a usage error", () => {
	const r = run('--keywords', 'x', 'plugins', 'list')
	assert.equal(r.code, 2)
	assert.equal(r.stderr, '')
	assert.match(r.stdout, /code: unknown-option/)
})
