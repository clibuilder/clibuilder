import { baseline, execCommand } from '@unional/fixture'

baseline({
  basePath: 'fixtures',
  casesFolder: '.',
  // filter: /has-rc-config/,
  filter: /has-.*-config/,
  suppressFilterWarnings: true
}, ({ caseName, casePath }) => {
  test(caseName, async () => {
    const { stdout, stderr } = await execCommand({ casePath, command: 'node', args: ['bin.js'] })
    if (stderr) console.info('sterr', stderr)
    expect(stdout).toEqual('{"a":1}')
  })
})
