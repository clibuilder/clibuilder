import { readdirSync, readFileSync } from 'node:fs'
const rows = {}
for (const d of readdirSync('runs')) {
  const [m, v, n] = d.split('-'); if (n === '0') continue
  let calls = [], j = {}
  try { calls = readFileSync(`runs/${d}/calls.jsonl`, 'utf8').trim().split('\n').filter(Boolean).map(JSON.parse) } catch {}
  try { j = JSON.parse(readFileSync(`runs/${d}/out.json`, 'utf8')) } catch {}
  const fixed = calls.some(c => c.ok && c.argv[0] === 'releases' && c.argv[1] === 'revert' && c.argv.includes('r-41'))
  const k = m + ' ' + v; (rows[k] ??= []).push({ calls: calls.length, wrong: calls.filter(c => !c.ok).length, helps: calls.filter(c => c.argv.includes('--help') || !c.argv.length).length, turns: j.num_turns, fixed })
}
for (const [k, r] of Object.entries(rows)) { const s = f => (r.reduce((a, x) => a + f(x), 0) / r.length).toFixed(2); console.log(k, 'n=' + r.length, 'fixed', r.filter(x => x.fixed).length, 'calls', s(x => x.calls), 'wrong', s(x => x.wrong), 'help', s(x => x.helps), 'turns', s(x => x.turns)) }
