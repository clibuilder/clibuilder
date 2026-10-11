---
'clibuilder': major
---

`--show-config` is an answer on stdout in `output: 'axi'`, the default, instead of `ui.info` lines on stderr. It follows `--format`: `toon` and `json` encode `source` (`file`, `package.json` or `none`), `path`, `property` for a `package.json` source, and `config`; `text` prints the lines 11.5.0 printed. It writes nothing to stderr and exits 0. In `output: 'console'` it is unchanged.

Coming from 11.5.0, the default output of `--show-config` is now `toon`, not the `config: <path>` line and the JSON. Migration: pass `--format text` for the 11.5.0 lines, `--format json` to read the fields, or set `output: 'console'`.
