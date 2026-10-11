---
'clibuilder': major
---

Add the upgrade guide for clibuilder 12, [Upgrading from clibuilder 11 to 12](https://clibuilder.github.io/clibuilder/guides/upgrade-to-12/), and the `@clibuilder/codemod` package that does the mechanical part of the upgrade.

Upgrading from 11.5.0: run `npx @clibuilder/codemod src`, then fix each `TODO(clibuilder-12)` comment it leaves and review the returned values it lists. The codemod rewrites `z` from `clibuilder` to `t`, moves the `@clibuilder/axi` value helpers to `clibuilder/axi`, moves `cli({ keywords })` to `.use(plugins({ keywords }))` from `@clibuilder/plugins`, and replaces `cli({ config })` with `.use(config())` from `clibuilder/config`. It flags what it cannot rewrite safely: zod forms outside the `t` subset and zod type annotations, a command's own `format` option, `ui.showHelp()` and `ui.showVersion()`, the other `@clibuilder/axi` imports, and `cli({ config })` without `plugins()`.

`@clibuilder/codemod` 0.1.0 is published with this release. Preview with `npx @clibuilder/codemod --dry-run src`.
