---
'clibuilder': minor
---

Add `ref()` and `placeholder()`: a `help` line that names another command, rendered as a complete command line. Under `cli()` it reads `<name> task get --gid 1` and is checked against the command tree. Under `runScript()` it renders as the sibling script, `pnpm exec <bin>` or a pinned `npx`, from the command map `universal-plugin plugin build` embeds. By default a ref is a plain `help` string, so the output keeps the AXI shape. `cli({ refs: 'next' })` and `runScript({ refs: 'next' })` encode refs as `next[N]{run,why}` instead. `CliError` keeps refs in `help`.
