# clibuilder

The clibuilder monorepo: the `clibuilder` CLI framework and its companion packages in `packages/*`, consumer test apps in `test-apps/*` and `test-plugins/*`, and the docs site in `apps/website`.

`pnpm verify` is the gate before a PR: biome check, build, coverage, depcheck, size, then the test-apps. It skips the website. For changes under `apps/website`, also run `pnpm web typecheck` and `pnpm web build`, which CI runs.

<!-- buddy-agent-harness:begin -->

Skills are canonical in `.agents/skills/`. Create and edit them there.
`.claude/skills/` is a generated link to it; never write to it directly.
This file is the one home for shared instructions; every harness reads it.

<!-- buddy-agent-harness:end -->
