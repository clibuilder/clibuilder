---
'clibuilder': minor
---

Add the `clibuilder/axi` subpath, which holds the value helpers from `@clibuilder/axi`: `truncateText`, `truncateList`, `defaultTextLimit`, `fullOption`, `orEmpty`, `homeHeader` and `collapseHome`. It also re-exports `result`, `document`, `empty` and `exitCodes`, so one import covers a command. `fullOption` is declared with `t.boolean().optional()` instead of zod.

If you use `@clibuilder/axi`, import the value helpers from `clibuilder/axi` instead, for example `import { truncateList } from 'clibuilder/axi'`.
