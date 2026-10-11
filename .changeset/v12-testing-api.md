---
'clibuilder': major
'@clibuilder/plugins': patch
'@clibuilder/codemod': patch
---

`testCommand(command, argv, options?)` takes one `options` object, `{ config, output, format }`, where it took `(command, argv, config?, options?)`. It also runs a `.default()` command. `@clibuilder/codemod` rewrites the old positional arguments.

```diff
- await testCommand(cmd, 'cmd', { a: 1 }, { output: 'console' })
+ await testCommand(cmd, 'cmd', { config: { a: 1 }, output: 'console' })
```

`mockPluginContext.Params` is now `mockPluginContext.Options`, and `loadPlugins.Context` is `loadPlugins.Options`. The old names stay as deprecated aliases, removed in clibuilder 13.

`clibuilder/testing` adds `mockExtensionContext()`, which builds the `ExtensionContext` for testing an extension and captures the commands, global options, `beforeRun` hooks and shared state it adds.
