import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Writable } from 'node:stream'
import { cli } from 'clibuilder'
import * as entry from './index.js'
import { loadPlugins, plugins, pluginsCommand } from './index.js'

function getPluginUrl(name: string) {
	return new URL(`../test-fixtures/plugins/${name}`, import.meta.url).href
}

it('exports plugins, pluginsCommand and loadPlugins', () => {
	expect(Object.keys(entry).sort()).toEqual(['loadPlugins', 'plugins', 'pluginsCommand'])
	expect(typeof plugins).toBe('function')
	expect(typeof pluginsCommand).toBe('function')
	expect(typeof loadPlugins).toBe('function')
})

it('loads plugins into a cli through use(), sharing the registry with their commands', async () => {
	const app = cli({ name: 'test-cli', version: '1.0.0' }).use(
		plugins({
			include: [
				getPluginUrl('registry-consumer.js'),
				getPluginUrl('registry-provider.js'),
				getPluginUrl('registry-provider-second.js')
			],
			command: false
		})
	)
	const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
	try {
		expect(await app.parse(['node', 'test-cli', 'registry'])).toEqual({
			capability: 'provided',
			sources: [getPluginUrl('registry-provider.js')]
		})
	} finally {
		warn.mockRestore()
	}
})

it('adds the plugins group to a cli, whose list answers with what it found', async () => {
	const cwd = process.cwd()
	process.chdir(mkdtempSync(join(tmpdir(), 'clibuilder-plugins-entry-')))
	try {
		let stdout = ''
		const stream = new Writable({
			write(chunk, _encoding, callback) {
				stdout += chunk
				callback()
			}
		})
		const app = cli({ name: 'test-cli', version: '1.0.0', streams: { stdout: stream, stderr: stream } }).use(
			plugins({ keywords: ['no-such-keyword-xyz'] })
		)
		// in the default `axi` output the empty state is the answer: printed in `--format`, and what parse() resolves to
		expect(await app.parse(['node', 'test-cli', 'plugins', 'list', '--format', 'json'])).toBe(
			'0 installed plugins found with keywords: no-such-keyword-xyz'
		)
		expect(stdout).toContain('0 installed plugins found with keywords: no-such-keyword-xyz')
	} finally {
		process.chdir(cwd)
	}
})
