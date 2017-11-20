import fs = require('fs')
import path = require('path')

export async function findPlugins(keyword, cwd) {
  const folders = await findPackageFolders(cwd)
  return folders.filter(f => {
    const content = readFileSafe(path.resolve(cwd, 'node_modules', f, 'package.json'))
    const pjson = content ? JSON.parse(content) : undefined
    if (!pjson || !pjson.keywords)
      return false
    return pjson.keywords.indexOf(keyword) !== -1
  })
}

async function findPackageFolders(cwd) {
  let dirs = await readDirSafe(path.resolve(cwd, 'node_modules'))
  // I can safely skip `@types` as it is not possible to have plugins
  const scopedDirs = dirs.filter(d => d.startsWith('@') && d !== '@types')
  dirs = dirs.filter(d => !d.startsWith('@') && !d.startsWith('.'))

  for (let scopedDir of scopedDirs) {
    const foldersInScopedDir = await readDirSafe(path.resolve(cwd, 'node_modules', scopedDir))
    dirs = dirs.concat(foldersInScopedDir.map(d => path.join(scopedDir, d)))
  }
  return dirs
}

function readDirSafe(path: string) {
  return new Promise<string[]>((a, r) => {
    fs.readdir(path, (err, dirs = []) => {
      // istanbul ignore next
      if (err && err.code !== 'ENOENT')
        r(err)
      a(dirs)
    })
  })
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
    // istanbul ignore next
    if (err.code === 'ENOENT')
      return undefined
    // istanbul ignore next
    throw err
  }
}
