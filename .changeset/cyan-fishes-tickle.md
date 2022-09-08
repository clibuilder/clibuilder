---
"clibuilder": major
---

`name` and `version` is now required, will not load from the CLI's `package.json` anymore.
This allows the CLI to be used as standalone app.

Change `configName` to `config`.
If not specified, config will not be loaded.
You can set it to `true` or to a specific config file name.

Config is now used to control which plugin to load,
similar to other tools such as `eslint` and `jest`.
It accepts `json`, `yaml`, or `js` file.

To specify plugins, add them under the `plugins` property:

```json
{
  "plugins": ["your-plugin"]
}
```

As such, `loadPlugins()` is removed.

Change `keyword` to `keywords`. It is now used for searching and listing of plugins,
instead of controlling whether to load config.
