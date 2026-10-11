import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { CliError } from './app/errors.js'
import { readConfigFile } from './config.js'
import { loadYaml } from './drivers/yaml.js'

// js-yaml is an optional peer: here it is not installed
vi.mock('./drivers/yaml.js', () => ({
	loadYaml: vi.fn(async () => {
		throw new CliError('reading a YAML config file needs js-yaml, which is not installed', {
			code: 'missing-peer-dependency'
		})
	})
}))

describe('a config file without js-yaml installed', () => {
	let dir: string
	beforeEach(() => {
		dir = mkdtempSync(join(tmpdir(), 'clibuilder-yaml-peer-'))
		vi.mocked(loadYaml).mockClear()
	})
	afterEach(() => rmSync(dir, { recursive: true, force: true }))

	it('reads a JSON config without loading js-yaml', async () => {
		const file = join(dir, 'app.json')
		writeFileSync(file, '{ "a": 1 }')
		expect(await readConfigFile(file)).toEqual({ a: 1 })
		expect(loadYaml).not.toHaveBeenCalled()
	})

	it('fails reading a YAML config with the missing peer error', async () => {
		const file = join(dir, 'app.yaml')
		writeFileSync(file, 'a: 1')
		await expect(readConfigFile(file)).rejects.toMatchObject({ code: 'missing-peer-dependency' })
	})
})
