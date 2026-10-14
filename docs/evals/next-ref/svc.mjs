#!/usr/bin/env node
// Q3 fixture: a platform CLI with a large (SVC_HELP=large) or absent (SVC_HELP=absent) --help.
// SVC_VARIANT=help|next picks the hint in `svc status`. The fix is
// `svc deploy rollback api --to r-41 --ack`; the command and its flags appear only in the large help or in the hint.
import { appendFileSync, existsSync, readFileSync } from 'node:fs'
const v = process.env.SVC_VARIANT
const h = process.env.SVC_HELP
const a = process.argv.slice(2)
const log = (ok) => process.env.SVC_LOG && appendFileSync(process.env.SVC_LOG, JSON.stringify({ argv: a, ok }) + '\n')
const done = (ok, out, code = 0) => { log(ok); console.log(out); process.exit(code) }
const usage = (msg) => done(false, `error: ${msg}\ncode: usage${h === 'large' ? '\nhelp[1]: run `svc --help` for usage' : ''}`, 2)

// 24 groups x 8 verbs, each with flags, plus the real one: about 200 lines, as gh or kubectl print.
const groups = ['access', 'alerts', 'audit', 'backup', 'billing', 'cache', 'certs', 'config', 'cron', 'deploy', 'dns', 'flags', 'gateway', 'images', 'jobs', 'keys', 'metrics', 'network', 'nodes', 'queue', 'quota', 'secrets', 'storage', 'traces']
const verbs = [['list', '[--env <env>] [--limit <n>]'], ['show', '<name> [--format <fmt>]'], ['create', '<name> --env <env> [--label <k=v>]'], ['update', '<name> --set <k=v> [--dry-run]'], ['delete', '<name> --ack'], ['sync', '[--env <env>] [--force]'], ['history', '<name> [--since <dur>]'], ['export', '[--out <file>] [--format <fmt>]']]
const lines = ['svc: platform operations', '', 'usage: svc <group> <verb> [args] [flags]', '', 'global flags:', '  --env <env>        target environment (default: prod)', '  --format <fmt>     output format: toon|json|text', '  --quiet            suppress progress output', '', 'top-level commands:', '  status                                   show service health', '  logs <service> [--since <dur>]           show recent logs', '']
for (const g of groups) {
  lines.push(`${g}:`)
  for (const [vb, args] of verbs) lines.push(`  svc ${g} ${vb} ${args}`.padEnd(60) + `${vb} ${g}`)
  if (g === 'deploy') {
    lines.push('  svc deploy rollback <service> --to <release> --ack'.padEnd(60) + 'roll a service back to an earlier release')
    lines.push('  svc deploy promote <service> --from <env> --ack'.padEnd(60) + 'promote a release between environments')
  }
  lines.push('')
}

if (a.length === 0 || a.includes('--help') || a.includes('-h') || a[0] === 'help') {
  if (h === 'absent') usage('no help is available for this command')
  done(true, lines.join('\n'))
}
const flag = (n) => { const i = a.indexOf(n); return i >= 0 ? a[i + 1] : undefined }
const fixed = process.env.SVC_LOG && existsSync(process.env.SVC_LOG) && readFileSync(process.env.SVC_LOG, 'utf8').split('\n').filter(Boolean).map(JSON.parse).some(c => c.ok && c.argv[1] === 'rollback')
if (a[0] === 'status' && a.length === 1) {
  if (fixed) done(true, 'services[3]{name,state,release}:\n  api,healthy,r-41\n  web,healthy,r-17\n  db,healthy,r-9')
  const base = `services[3]{name,state,release}:
  api,failing,r-42
  web,healthy,r-17
  db,healthy,r-9
failed: api release r-42 (last good: r-41)`
  if (v === 'help') done(true, base + '\nhelp[1]: use the deploy rollback command to roll api back to its last good release')
  if (v === 'next') done(true, base + '\nnext[1]{run,why}:\n  svc deploy rollback api --to r-41 --ack,roll api back to last good release r-41')
}
if (a[0] === 'logs' && a[1]) done(true, fixed ? 'api: rolled back to r-41; health check passing' : 'api: health check failed on /healthz after deploy of r-42')
if (a[0] === 'deploy' && a[1] === 'rollback') {
  if (a[2] !== 'api') usage(a[2] ? `unknown service: ${a[2]}` : 'missing argument <service>')
  const known = new Set(['deploy', 'rollback', 'api', '--to', flag('--to'), '--ack', '--env', flag('--env'), '--format', flag('--format'), '--quiet'])
  const extra = a.find(x => !known.has(x))
  if (extra) usage(`unknown option ${extra}`)
  if (!flag('--to')) usage('missing required option --to <release>')
  if (flag('--to') === 'r-42') done(false, 'refusing: r-42 is the failed release', 2)
  if (flag('--to') !== 'r-41') usage(`unknown release: ${flag('--to')}`)
  if (!a.includes('--ack')) usage('missing required option --ack')
  done(true, 'ok: true\nservice: api\nrelease: r-41\nstate: healthy')
}
if (a[0] === 'deploy' && a[1] === 'history' && a[2]) done(true, 'releases[3]{id,state}:\n  r-42,failed\n  r-41,good\n  r-40,good')
if (groups.includes(a[0]) && a[1] === 'list') done(true, `${a[0]}[0]:`)
if (a[0] === 'deploy') usage(a[1] ? `unknown command: deploy ${a[1]}` : 'missing command for deploy')
usage(`unknown command: ${a[0]}`)
