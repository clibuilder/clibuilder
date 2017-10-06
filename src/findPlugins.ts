import fs = require('fs')
import path = require('path')

export function findPlugins(keyword, cwd) {
  const folders = findPackageFolders(cwd)
  return folders.filter(f => {
    const pjson = JSON.parse(fs.readFileSync(path.resolve(cwd, 'node_modules', f, 'package.json'), 'utf8'))
    if (!pjson || !pjson.keywords)
      return false
    return pjson.keywords.indexOf(keyword) !== -1
  })
}

function readDirSafe(path: string) {
  let dirs: string[]
  try {
    dirs = fs.readdirSync(path)
  }
  catch (err) {
    if (err.code === 'ENOENT')
      dirs = []
    else
      throw err
  }
  return dirs
}

function findPackageFolders(cwd): string[] {
  let dirs = readDirSafe(path.resolve(cwd, 'node_modules'))
  // I can safely skip `@types` as it is not possible to have plugins
  const scopedDirs = dirs.filter(d => d.startsWith('@') && d !== '@types')
  dirs = dirs.filter(d => !d.startsWith('@') && !d.startsWith('.'))
  scopedDirs.forEach(sd => {
    dirs = dirs.concat(readDirSafe(path.resolve(cwd, 'node_modules', sd)).map(d => path.join(sd, d)))
  })

  return dirs
}
