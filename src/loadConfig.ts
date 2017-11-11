import findUp = require('find-up')
import fs = require('fs')

export function loadConfig(configFileName: string, cwd: string = process.cwd()) {
  const filePath = findUp.sync(configFileName, { cwd })

  return filePath ? readConfig(filePath) : undefined
}

function readConfig(filePath: string) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  }
  catch (err) {
    if (err.code === 'ENOENT')
      return
    throw err
  }
}
