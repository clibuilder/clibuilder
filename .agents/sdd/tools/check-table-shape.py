#!/usr/bin/env python3
"""Flag a markdown table whose rows disagree on column count.

Why this exists: check-suite validates the scenario map's rows but not the
other tables in a spec. A three-column scenario-map row inserted into a
two-column entry-point table passed check-suite clean; only a human reader
caught it. This closes that gap.

Two things it must do to be useful, both learned the hard way:
  - ignore escaped pipes (`a \\| b`) inside cells, or every table carrying a
    union type reads as ragged;
  - ignore fenced code blocks, where mermaid arrows and pipes are not tables.

Usage: python3 check-table-shape.py [spec-dir]
"""
import glob, sys, os

SPEC = sys.argv[1] if len(sys.argv) > 1 else 'packages/clibuilder/.agents/spec'
bad = 0
for f in sorted(glob.glob(os.path.join(SPEC, '*', 'README.md')) + glob.glob(os.path.join(SPEC, '*.md'))):
    rows, infence = [], False
    for i, l in enumerate(open(f), 1):
        if l.startswith('```'):
            infence = not infence
            continue
        if infence:
            continue
        if l.startswith('|'):
            rows.append((i, l.replace('\\|', '').count('|')))
        else:
            if len(rows) > 1 and len({c for _, c in rows}) > 1:
                print(f"RAGGED {f}: lines {rows[0][0]}-{rows[-1][0]} column counts {sorted({c for _, c in rows})}")
                bad += 1
            rows = []
print(f"{bad} ragged table(s)")
sys.exit(1 if bad else 0)
