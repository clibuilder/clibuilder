import fs = require('fs')
import path = require('path')

export function findPlugins(keyword, cwd) {
  const folders = findPackageFolders(cwd)
  return folders.filter(f => {
    const content = readFileSafe(path.resolve(cwd, 'node_modules', f, 'package.json'))
    const pjson = content ? JSON.parse(content) : undefined
    if (!pjson || !pjson.keywords)
      return false
    return pjson.keywords.indexOf(keyword) !== -1
  })
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

/**
 * Read file and ignore ENOENT.
 * When the the folder is a link, the link may be invalid.
 * That will result in ENOENT.
 * @param path file path.
 */
function readFileSafe(path) {
  try {
    return fs.readFileSync(path, 'utf8')
  }
  catch (err) {
    if (err.code === 'ENOENT')
      return undefined
    throw err
  }
}
