import { findUpSync } from 'find-up'
import { readFileSync } from 'fs'
import yaml from 'js-yaml'
import { pathToFileURL } from 'node:url'
import type { UI } from './cli.js'
import { findPackageJson, getPackageJson } from './platform.js'

export const ctx = {
	findPackageJson,
	getPackageJson
}

export async function loadConfig(
	{
		cwd,
		ui
	}: {
		cwd: string
		ui: Pick<UI, 'info' | 'debug' | 'warn'>
	},
	configName: string
) {
	const configFileNames = getConfigFilenames(configName)
	const configFilePath = resolveConfigFilenames(cwd, configFileNames)
	if (configFilePath) {
		ui.debug(`load config from: ${configFilePath}`)
		const cfg = await readConfig(configFilePath)
		ui.debug(`config: ${JSON.stringify(cfg, undefined, 2)}`)
		return cfg
	}
	const pjsonPath = ctx.findPackageJson(cwd)
	if (pjsonPath) {
		ui.debug(`load config from package.json: ${pjsonPath}`)
		const pjson = ctx.getPackageJson(pjsonPath)
		if (pjson[configName]) return pjson[configName]
	}
	ui.warn(`no config found under '${cwd}':\n  ${configFileNames.join('\n  ')}`)
}

function getConfigFilenames(configFileName: string) {
	const names = [
		configFileName,
		`${configFileName}.cjs`,
		`${configFileName}.mjs`,
		`${configFileName}.js`,
		`${configFileName}.json`,
		`${configFileName}.yml`,
		`${configFileName}.yaml`,
		`${configFileName}rc.cjs`,
		`${configFileName}rc.mjs`,
		`${configFileName}rc.js`,
		`${configFileName}rc.json`,
		`${configFileName}rc.yml`,
		`${configFileName}rc.yaml`,
		`${configFileName}rc`
	]
	return configFileName.startsWith('.') ? names : names.flatMap((n) => [n, `.${n}`])
}

function resolveConfigFilenames(cwd: string, filenames: string[]) {
	for (const filename of filenames) {
		const filePath = findUpSync(filename, { cwd })
		if (filePath) return filePath
	}
}

// ignoring coverage. Test are done through `@unional/fixture` `execCommand()`
// istanbul ignore next
async function readConfig(configFilePath: string) {
	const content = readFileSync(configFilePath, 'utf-8')
	try {
		return JSON.parse(content)
	} catch {
		try {
			return yaml.load(content)
		} catch {
			const m = await import(pathToFileURL(configFilePath).href)
			if (m.activate) return m
			return m.default
		}
	}
}
