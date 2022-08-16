import findUp from 'find-up'
import { existsSync, readFileSync } from 'fs'
import path from 'path'
import { UI } from './cli'
import { findPackageJson, getHomePath, getPackageJson } from './platform'
import importFresh from 'import-fresh'
import yaml from 'js-yaml'

export const ctx = {
  cwd: process.cwd,
  getHomePath,
  findPackageJson,
  getPackageJson
}

export namespace loadConfig {
  export type Params = {
    name: string,
    configName?: string | boolean
  }
}

export async function loadConfig({ ui }: { ui: Pick<UI, 'info' | 'debug' | 'warn'> }, configName: string) {
  const cwd = ctx.cwd()
  const home = ctx.getHomePath()

  const configFileNames = getConfigFilenames(configName)
  const configFilePath = resolveConfigFilenames(cwd, home, configFileNames)
  if (configFilePath) {
    ui.debug(`load config from: ${configFilePath}`)
    const cfg = readConfig(configFilePath)
    ui.debug(`config: ${cfg}`)
    return cfg
  }
  else {
    const pjsonPath = ctx.findPackageJson(cwd)
    if (pjsonPath) {
      const pjson = ctx.getPackageJson(pjsonPath)
      if (pjson[configName]) return pjson[configName]
    }
    ui.warn(`no config found:\n  ${configFileNames.join('\n  ')}`)
  }
}

function getConfigFilenames(configFileName: string) {
  if (configFileName.startsWith('.')) {
    return [
      configFileName,
      `${configFileName}.json`,
      `${configFileName}rc.json`,
      `${configFileName}rc`
    ]
  }
  if (configFileName.indexOf('.') >= 0) {
    return [configFileName]
  }

  return [
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
    if (existsSync(filePath)) return filePath
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
