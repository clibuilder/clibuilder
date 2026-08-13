---
"clibuilder": minor
---

Add `--format` to `plugins list`.

`plugins list --format <toon|text|json>` picks how the installed plugins are rendered,
matching `plugins search`. The default is `toon`, following the Agent eXperience
Interface — a cli's plugin list is read by an agent far more often than by a person:

```
plugins[2]: my-cli-plugin,@acme/my-cli-plugin-deploy
help[1]: Run `plugins search` to find more plugins on npm
```

Nothing installed is stated as the answer rather than left as silence, and it says
`installed` because that is the whole difference from what `search` reports — nothing
installed here says nothing about what exists on npm:

```
plugins: 0 installed plugins found with keywords: my-cli-plugin
help[1]: Run `plugins search` to find plugins to install
```

`--format text` is the previous human-readable prose, unchanged, including its separate
wording for none, one, and several. `toon` and `json` report one shape whatever the
count. `--format json` emits `{ "plugins": [...] }` alone, with no help line, so it
survives a pipe into `jq`. The command still returns the plugin names to its caller.
