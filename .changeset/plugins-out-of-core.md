---
'clibuilder': major
---

Plugin support moved out of core into [`@clibuilder/plugins`](https://www.npmjs.com/package/@clibuilder/plugins). Upgrading from 11.5.0:

- `cli({ config })` loads the config for your commands only. It no longer loads the plugins named by the config's `plugins` key.
- The `keywords` option of `cli()` and `this.keywords` in `run()` are removed. Pass them to `plugins({ keywords })` instead, which defaults to the CLI's name as before.
- The `plugins list` / `plugins search` group is no longer added when `config` or `keywords` is set. `plugins()` adds it.
- `import-meta-resolve`, `find-installed-packages` and `search-packages` are no longer dependencies of `clibuilder`.

Migration, one call:

```diff
+ import { plugins } from '@clibuilder/plugins'

- cli({ name: 'my-cli', version: '1.0.0', config: true, keywords: ['my-cli-plugin'] })
+ cli({ name: 'my-cli', version: '1.0.0', config: true })
+   .use(plugins({ keywords: ['my-cli-plugin'] }))
```

A CLI whose config lists `plugins` but that loads none (no extension reads the config) warns once, naming `@clibuilder/plugins`, so plugins do not stop loading silently. For example, repobuddy/buddy relies on `cli({ config: true })` loading plugins and needs one added `.use(plugins())` call.

Unchanged: `cli().use()` and `ExtensionContext`, the registry (`defineKey`, `defineCollectionKey`, `this.registry`), config loading, and `mockPluginContext` from `clibuilder/testing`. A plugin's `activate(context)` gets the same context as in 11. `import type { PluginActivationContext } from 'clibuilder'` still compiles but is deprecated: import it from `@clibuilder/plugins`. The copy in `clibuilder` is removed in 13.
