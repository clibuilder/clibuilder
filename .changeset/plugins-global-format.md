---
'@clibuilder/plugins': patch
---

`plugins list` and `plugins search` give way to clibuilder's global `--format` when it is active (under `cli({ output: 'axi' })` or `cli({ format })`): their own `--format` option is dropped instead of conflicting with it, and they report in `this.format`. Otherwise they keep their own `--format`, default `toon`, as before.
