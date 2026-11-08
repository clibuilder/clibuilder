---
"clibuilder": minor
---

`ref()` resolves relative to the command that issued it, so a command tree that runs both standalone and mounted under a group can use it ([#755](https://github.com/clibuilder/clibuilder/issues/755)).

The path is looked up from the issuing command's group, then each enclosing group up to the root, and the first that holds it wins. The line is rendered from the root. A tree mounted at `buddy agent-harness` can write `ref('init')` from its `doctor` command and get `buddy agent-harness init`; standalone, the same ref renders as `buddy-agent-harness init`. This applies to answers and to a `CliError`'s `help`, under `cli()` and under `runScript()`, where the running script's own path in the command map is the starting point. A path that no enclosing group holds still throws under `cli()`.

Migration: a ref that resolved from the root before resolves the same way, unless a nearer group also holds that path. Then the nearer one wins. To name the root's command in that case, write the path from a group that holds no such path.
