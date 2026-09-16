#!/usr/bin/env python3
"""Sweep an SDD spec tree for the absent-case defect family (R5 + R7).

Three checks, all candidate-generating and all over-reporting by design —
every hit needs a read against the graph before it is believed:

  UNCOVERED-SINK       a decision arm ending at a plain node no scenario-map
                       Edge names. The common shape: the `yes` branch is
                       covered and the `no` branch runs to an unnamed sink.
  SHARED-SINK          one plain node reached from several decisions but
                       carrying fewer map rows than decisions feeding it, so
                       one decision's outcome is untested by construction.
  ABSENCE-NOT-ASSERTED a map Edge stating an absence ("no", "empty", "dropped")
                       whose scenario's steps assert no absence at all — the
                       Then is satisfied by a subject that renders the thing.

Known false positives: HTML entities in mermaid labels (&lt; &gt;) defeat the
substring match, and legitimate join points (several decisions converging on
one downstream step) look like SHARED-SINK. Read every hit.

Usage: python3 check-absent-cases.py [spec-dir]
"""
import re,os,sys,glob,html

SPEC=sys.argv[1] if len(sys.argv)>1 else 'packages/clibuilder/.agents/spec'
def norm(t):
    t=html.unescape(t).replace('`','').replace('"','').replace("'",'')
    return re.sub(r'\s+',' ',t).strip().lower()
NEG=re.compile(r'\b(no|none|nothing|not|never|empty|unset|absent|omit\w*|drop\w*|skip\w*|without|left out|neither|rather than|silently)\b')

def parse_mermaid(md):
    labels={};kinds={};edges=[]
    for b in re.findall(r'```mermaid\n(.*?)```',md,re.S):
        for line in b.split('\n'):
            line=line.strip()
            if not line or line.startswith('graph'):continue
            for m in re.finditer(r'([A-Za-z0-9_]+)(\{|\[)("?)(.*?)\3(\}|\])',line):
                labels[m.group(1)]=m.group(4); kinds[m.group(1)]='D' if m.group(2)=='{' else 'P'
            for m in re.finditer(r'([A-Za-z0-9_]+)(?:\{.*?\}|\[.*?\])?\s*(?:--\s*"?(.*?)"?\s*)?-->\s*([A-Za-z0-9_]+)',line):
                edges.append((m.group(1),(m.group(2) or '').strip(),m.group(3)))
    return labels,kinds,edges

def parse_map(md):
    rows=[]
    for line in md.split('\n'):
        if not line.startswith('|'):continue
        c=[x.strip() for x in line.strip('|').split('|')]
        if len(c)!=3 or c[0].lower()=='edge' or set(c[0])<=set('-: '):continue
        rows.append(tuple(c))
    return rows

def parse_feature(t):
    sc={};cur=None
    for line in t.split('\n'):
        m=re.match(r'\s*Scenario:\s*(.+)',line)
        if m:cur=m.group(1).strip();sc[cur]=[]
        elif cur and line.strip():sc[cur].append(line.strip())
    return sc

hits=0
for n in sorted(os.path.basename(os.path.dirname(p)) for p in glob.glob(f'{SPEC}/*/*.feature')):
    md=open(f'{SPEC}/{n}/README.md').read()
    ft=open(glob.glob(f'{SPEC}/{n}/*.feature')[0]).read()
    labels,kinds,edges=parse_mermaid(md); rows=parse_map(md); sc=parse_feature(ft)
    me=[norm(r[0]) for r in rows]; out=[]
    indeg={}
    for s_,l_,d_ in edges: indeg.setdefault(d_,set()).add(s_)
    for s_,l_,d_ in edges:
        if kinds.get(s_)!='D' or kinds.get(d_)!='P': continue
        tgt=norm(labels.get(d_,d_)); el=norm(l_)
        if any(tgt and (tgt in m or m in tgt) for m in me): continue
        if el and any(el in m or m in el for m in me): continue
        out.append(('UNCOVERED-SINK',f'{s_} --{l_ or "?"}--> {d_} [{labels.get(d_,d_)[:55]}]'))
    for d_,ss in indeg.items():
        ds=[x for x in ss if kinds.get(x)=='D']
        if len(ds)>1 and kinds.get(d_)=='P':
            tgt=norm(labels.get(d_,d_))
            h=sum(1 for m in me if tgt and (tgt in m or m in tgt))
            if h<len(ds): out.append(('SHARED-SINK',f'{d_} [{labels.get(d_,d_)[:45]}] <- {sorted(ds)}, {h} map row(s)'))
    for e,path,scen in rows:
        t=scen.strip('`')
        if t in sc and NEG.search(norm(e)) and not NEG.search(norm(' '.join(sc[t]))):
            out.append(('ABSENCE-NOT-ASSERTED',f'"{e}" -> `{t}`'))
    if out:
        print(f'\n=== {n} ===')
        for k,v in out: print(f'  {k}: {v}'); hits+=1
print(f'\n{hits} candidates — each needs a read against the graph.')
