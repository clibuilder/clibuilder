#!/usr/bin/env node
import { appendFileSync } from 'node:fs'
const v = process.env.OPS_VARIANT
const a = process.argv.slice(2)
const log = (ok) => process.env.OPS_LOG && appendFileSync(process.env.OPS_LOG, JSON.stringify({ argv: a, ok }) + '\n')
const done = (ok, out, code = 0) => { log(ok); console.log(out); process.exit(code) }
const usageErr = () => {
  if (v === 'prose') done(false, 'ops: unrecognized command or options. Try --help.', 2)
  done(false, 'error: unrecognized command or options\ncode: usage\nhelp[1]: try --help', 2)
}
if (a.includes('--help') || a.length === 0) {
  done(true, `ops: service operations
commands:
  status                         show service health
  logs <service>                 show recent logs
  releases list <service>        list releases
  releases revert <service> --release <id> --confirm   roll back to a release
  restart <service> --confirm    restart a service`)
}
const flag = (n) => { const i = a.indexOf(n); return i >= 0 ? a[i + 1] : undefined }
if (a[0] === 'status' && a.length === 1) {
  if (v === 'prose') done(true, 'Service api is failing: release r-42 failed its health check and r-41 was the last good release. Services web and db are healthy.')
  const base = `services[3]{name,state,release}:
  api,failing,r-42
  web,healthy,r-17
  db,healthy,r-9
failed: api release r-42 (last good: r-41)`
  if (v === 'help') done(true, base + '\nhelp[1]: use the releases revert command to roll back a failed release to the last good one')
  if (v === 'next') done(true, base + '\nnext[1]{run,why}:\n  ops releases revert api --release r-41 --confirm,roll back api to last good release r-41')
}
if (a[0] === 'releases' && a[1] === 'revert' && a[2] === 'api' && flag('--release') === 'r-41' && a.includes('--confirm')) {
  done(true, v === 'prose' ? 'Rolled api back to r-41. api is healthy.' : 'ok: true\nservice: api\nrelease: r-41\nstate: healthy')
}
if (a[0] === 'releases' && a[1] === 'revert' && a[2] === 'api' && flag('--release') === 'r-42') done(false, 'refusing: r-42 is the failed release', 2)
if (a[0] === 'releases' && a[1] === 'list' && a[2]) done(true, 'api: r-42 (failed), r-41, r-40')
if (a[0] === 'logs' && a[1]) done(true, 'api: health check failed on /healthz')
if (a[0] === 'restart') done(false, 'restart: api restarted but release r-42 still fails its health check', 1)
usageErr()
