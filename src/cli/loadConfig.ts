import findUp from 'find-up'
import fs from 'fs'
import path from 'path'

const win = process.platform === 'win32'

export function loadConfig(configFileName: string, { cwd, home }: { cwd: string, home?: string } = {} as any) {
  cwd = cwd || process.cwd()
  home = home || (win ?
    process.env.USERPROFILE :
    process.env.HOME)

  let filePath = findUp.sync(configFileName, { cwd })
  if (!filePath && home)
    filePath = path.join(home, configFileName)
  return filePath ? readConfig(filePath) : undefined
}

function readConfig(filePath: string) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'))
  }
  catch (err) {
    if (err.code === 'ENOENT')
      return
    // istanbul ignore next
    throw err
  }
}
