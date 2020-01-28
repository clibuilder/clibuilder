import findUp from 'find-up'
import fs from 'fs'
import path from 'path'

const win = process.platform === 'win32'

export namespace loadConfig {
  export type Options = {
    cwd: string,
    home?: string
  }
}

export function loadConfig(configName: string, { cwd, home }: loadConfig.Options) {
  const filePath = discoverConfigFile(configName, {
    cwd,
    home: home || (win ? process.env.USERPROFILE : process.env.HOME)
  })
  return filePath ? readConfig(filePath) : undefined
}

function discoverConfigFile(configName: string, options: loadConfig.Options) {
  return findConfigFile(`${configName}.json`, options) ||
    findConfigFile(`${configName}.js`, options) ||
    findConfigFile(`${configName}rc`, options)
}

function findConfigFile(configFileName: string, { cwd, home }: loadConfig.Options) {
  let filePath = findUp.sync(configFileName, { cwd })
  if (!filePath && home) {
    filePath = path.join(home, configFileName)
    return fs.existsSync(filePath) ? filePath : undefined
  }

  return filePath
}

function readConfig(filePath: string) {
  try {
    return path.extname(filePath) === '.json' ?
      JSON.parse(fs.readFileSync(filePath, 'utf-8')) :
      require(filePath)
  }
  catch (err) {
    if (err.code === 'ENOENT')
      return
    // istanbul ignore next
    throw err
  }
}
