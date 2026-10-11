import { CliError } from '../app/errors.js'
import { loadYaml } from './yaml.js'

function notFound(specifier: string) {
	return Object.assign(new Error(`Cannot find package '${specifier}' imported from /app/cli.js`), {
		code: 'ERR_MODULE_NOT_FOUND'
	})
}

describe('loadYaml()', () => {
	it('loads js-yaml when it is installed', async () => {
		const yaml = await loadYaml()
		expect(yaml.load('a: 1')).toEqual({ a: 1 })
	})

	it('fails with an actionable CliError when js-yaml is not installed', async () => {
		const err = await loadYaml(() => Promise.reject(notFound('js-yaml'))).catch((e) => e)
		expect(err).toBeInstanceOf(CliError)
		expect(err.message).toBe('reading a YAML config file needs js-yaml, which is not installed')
		expect(err.code).toBe('missing-peer-dependency')
		expect(err.details).toEqual({ package: 'js-yaml' })
		expect(err.help).toEqual(['install it next to the cli: npm install js-yaml'])
	})

	it('also recognizes the CommonJS not-found error', async () => {
		const missing = Object.assign(new Error("Cannot find module 'js-yaml'"), { code: 'MODULE_NOT_FOUND' })
		const err = await loadYaml(() => Promise.reject(missing)).catch((e) => e)
		expect(err.code).toBe('missing-peer-dependency')
	})

	it('lets any other failure through', async () => {
		const other = notFound('argparse')
		await expect(loadYaml(() => Promise.reject(other))).rejects.toBe(other)
	})
})
