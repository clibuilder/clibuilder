// usage: node an-q3.mjs [runs dir]   (default ./runs-q3)
import { readdirSync, readFileSync } from 'node:fs'
const R = process.argv[2] ?? 'runs-q3', rows = {}
for (const d of readdirSync(R)) {
  const [m, h, v] = d.split('~')
  let calls = [], j = {}
  try { calls = readFileSync(`${R}/${d}/calls.jsonl`, 'utf8').trim().split('\n').filter(Boolean).map(JSON.parse) } catch {}
  try { j = JSON.parse(readFileSync(`${R}/${d}/out.json`, 'utf8')) } catch {}
  const u = j.usage ?? {}
  const fixed = calls.some(c => c.ok && c.argv[0] === 'deploy' && c.argv[1] === 'rollback')
  const k = [m, h, v].join(' ');
  (rows[k] ??= []).push({ fixed, calls: calls.length, wrong: calls.filter(c => !c.ok).length, helps: calls.filter(c => !c.argv.length || c.argv.some(x => ['--help', '-h', 'help'].includes(x))).length, turns: j.num_turns ?? 0, ktok: ((u.input_tokens ?? 0) + (u.cache_creation_input_tokens ?? 0) + (u.cache_read_input_tokens ?? 0)) / 1000, cost: j.total_cost_usd ?? 0 })
}
console.log('| model | help | variant | runs | fixed | calls | wrong calls | help calls | turns | input ktok | cost USD |\n| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |')
for (const [k, r] of Object.entries(rows).sort()) {
  const s = (f, p = 2) => (r.reduce((a, x) => a + f(x), 0) / r.length).toFixed(p)
  console.log(`| ${k.split(' ').join(' | ')} | ${r.length} | ${r.filter(x => x.fixed).length} | ${s(x => x.calls)} | ${s(x => x.wrong)} | ${s(x => x.helps)} | ${s(x => x.turns)} | ${s(x => x.ktok, 1)} | ${s(x => x.cost, 4)} |`)
}
