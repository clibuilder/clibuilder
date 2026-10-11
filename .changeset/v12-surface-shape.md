---
'clibuilder': patch
'@clibuilder/codemod': patch
---

`clibuilder/axi` also exports `CliError` and `isCliError`, so one import covers a command. `clibuilder/compile-cache` exports only `enableCompileCache`; the test hook it leaked is internal. `truncateText`, `truncateList` and `homeHeader` gain `Options`/`Result` namespaces, and `runCodemod` and `transform` in `@clibuilder/codemod` gain `Options`/`Summary`/`Result` in place of the flat `RunOptions`, `RunSummary`, `TransformOptions` and `TransformResult`. The registry, config loading, `UI` and `ExtensionContext` exports are documented.
