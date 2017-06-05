'use strict';

const cp = require('child_process');
const path = require('path');

const outDir = 'dist-es5'

function getOutFilepath() {
  let filepath = path.relative(process.cwd() + '/src', process.argv[2]);
  let extension = path.extname(filepath)
  console.log(extension, extension === '.ts')
  filepath = filepath.slice(0, -extension.length) + (extension === '.ts' ? '.js' : '.jsx')
  console.log(filepath)
  return filepath = `${outDir}/${filepath}`
}

const filepath = getOutFilepath()
process.argv[2] = filepath

cp.spawnSync('node', ['./node_modules/ava/profile.js', filepath], {
  stdio: 'inherit',
  shell: true
})
