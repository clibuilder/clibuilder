import { execFile } from 'node:child_process'
import { join } from 'node:path'
import { promisify } from 'node:util'

const exec = promisify(execFile)

/**
 * Runs a fixture cli in its own process, from its own folder,
 * so its plugins resolve from the fixture's `node_modules` as a real project's would.
 * Each fixture cli is `cli().use(config()).use(plugins())`, and its config names the plugins.
 */
async function run(fixture: string, ...args: string[]) {
	const cwd = join(import.meta.dirname, '..', 'fixtures', fixture)
	try {
		const { stdout, stderr } = await exec('node', ['bin.js', ...args], { cwd })
		return { stdout: stdout.trim(), stderr, exitCode: 0 }
	} catch (e: any) {
		return { stdout: String(e.stdout).trim(), stderr: String(e.stderr), exitCode: e.code as number }
	}
}

// the plugin commands log through `ui.info`, a diagnostic on stderr, and return the echoed value,
// which the default `axi` output prints on stdout
it('loads a CommonJS plugin the config names', async () => {
	expect(await run('cli-with-one-plugin', 'one', 'echo', 'hello')).toMatchObject({
		stdout: 'hello',
		stderr: 'echo hello\n',
		exitCode: 0
	})
})

it('loads an ESM plugin the config names', async () => {
	// esm-plugin logs `echo` alone
	expect(await run('cli-with-one-esm-plugin', 'one', 'echo', 'hello')).toMatchObject({
		stdout: 'hello',
		stderr: 'echo\n',
		exitCode: 0
	})
})

// https://github.com/clibuilder/clibuilder/issues/286
// `exec()` resolves only when the child process exits on its own,
// so this hangs (and times out) if an async plugin command retains the event loop.
it('exits after an async plugin command resolves', async () => {
	expect(await run('cli-with-async-plugin', 'async', 'echo', 'hello')).toMatchObject({
		stdout: 'hello',
		stderr: 'echo hello\n',
		exitCode: 0
	})
})

// the fixture cli has no default command, so running it bare is a usage error (#609)
it.each(['bad-plugin', 'bad-plugin-no-index'])('reports and skips %s, which has no activate function', async (name) => {
	const { stderr, exitCode } = await run(name)
	expect(exitCode).toBe(2)
	expect(stderr).toContain('not a valid plugin')
	expect(stderr).toContain(name)
})
