import findUp from 'find-up'
import { existsSync, readFileSync, statSync } from 'fs'
import importFresh from 'import-fresh'
import yaml from 'js-yaml'
import path from 'path'
import { UI } from './cli.js'
import { findPackageJson, getHomePath, getPackageJson } from './platform.js'

export const ctx = {
  getHomePath,
  findPackageJson,
  getPackageJson
}

export async function loadConfig({ cwd, ui }: {
  cwd: string,
  ui: Pick<UI, 'info' | 'debug' | 'warn'>
}, configName: string) {
  const home = ctx.getHomePath()
  const configFileNames = getConfigFilenames(configName)
  const configFilePath = resolveConfigFilenames(cwd, home, configFileNames)
  if (configFilePath) {
    ui.debug(`load config from: ${configFilePath}`)
    const cfg = await readConfig(configFilePath)
    ui.debug(`config: ${JSON.stringify(cfg, undefined, 2)}`)
    return cfg
  }
  else {
    const pjsonPath = ctx.findPackageJson(cwd)
    ui.debug(`load config from: ${pjsonPath}`)
    if (pjsonPath) {
      const pjson = ctx.getPackageJson(pjsonPath)
      if (pjson[configName]) return pjson[configName]
    }
  }
  ui.warn(`no config found:\n  ${configFileNames.join('\n  ')}`)
}

function getConfigFilenames(configFileName: string) {
  return [
    configFileName,
    `${configFileName}.cjs`,
    `.${configFileName}.cjs`,
    `${configFileName}.mjs`,
    `.${configFileName}.mjs`,
    `${configFileName}.js`,
    `.${configFileName}.js`,
    `${configFileName}.json`,
    `.${configFileName}.json`,
    `${configFileName}.yml`,
    `.${configFileName}.yml`,
    `${configFileName}.yaml`,
    `.${configFileName}.yaml`,
    `${configFileName}rc.cjs`,
    `.${configFileName}rc.cjs`,
    `${configFileName}rc.mjs`,
    `.${configFileName}rc.mjs`,
    `${configFileName}rc.js`,
    `.${configFileName}rc.js`,
    `${configFileName}rc.json`,
    `.${configFileName}rc.json`,
    `${configFileName}rc.yml`,
    `.${configFileName}rc.yml`,
    `${configFileName}rc.yaml`,
    `.${configFileName}rc.yaml`,
    `${configFileName}rc`,
    `.${configFileName}rc`,
  ]
}

function resolveConfigFilenames(cwd: string, home: string, filenames: string[]) {
  for (const filename of filenames) {
    const filePath = findUp.sync(filename, { cwd })
    if (filePath) return filePath
  }
  for (const filename of filenames) {
    const filePath = path.join(home, filename)
    // istanbul ignore next
    if (existsSync(filePath) && statSync(filePath).isFile()) return filePath
  }
}

async function readConfig(configFilePath: string) {
  const content = readFileSync(configFilePath, 'utf-8')
  try {
    return JSON.parse(content)
  } catch {
    try {
      return yaml.load(content)
    } catch {
      try {
        return importFresh(configFilePath)
      } catch {
        return (await import(configFilePath)).default
      }
    }
  }
}
