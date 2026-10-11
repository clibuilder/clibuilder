import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
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

it('adds the plugins group to a cli, whose list returns what it found', async () => {
	const cwd = process.cwd()
	process.chdir(mkdtempSync(join(tmpdir(), 'clibuilder-plugins-entry-')))
	try {
		const app = cli({ name: 'test-cli', version: '1.0.0' }).use(plugins({ keywords: ['no-such-keyword-xyz'] }))
		const info = vi.spyOn(console, 'info').mockImplementation(() => {})
		const log = vi.spyOn(console, 'log').mockImplementation(() => {})
		try {
			expect(await app.parse(['node', 'test-cli', 'plugins', 'list', '--format', 'json'])).toEqual([])
		} finally {
			info.mockRestore()
			log.mockRestore()
		}
	} finally {
		process.chdir(cwd)
	}
})
