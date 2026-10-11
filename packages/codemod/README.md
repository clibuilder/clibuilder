# @clibuilder/codemod

Upgrades a `clibuilder` 11 CLI to `clibuilder` 12.

```sh
npx @clibuilder/codemod --dry-run src
npx @clibuilder/codemod src
```

It rewrites `z` from `clibuilder` to `t`, moves `@clibuilder/axi` value helpers to `clibuilder/axi`,
moves `cli({ keywords })` to `.use(plugins({ keywords }))`, replaces `cli({ config })` with
`.use(config())` from `clibuilder/config`, moves the config functions such as `resolveConfig` from
`clibuilder` to `clibuilder/config`, moves `testCommand` from `clibuilder` to `clibuilder/testing`, and rewrites its `config` and `options` arguments into one `options` object. It flags what it cannot rewrite with a `// TODO(clibuilder-12): …` comment,
and lists every `return <expr>` in a `run()`, which clibuilder 12 prints.

| Option | Meaning |
| --- | --- |
| `--dry-run` | print a unified diff instead of writing files |
| `--add-plugins` | add `.use(plugins())`, after `.use(config())`, to every `cli()` that sets `config` |

See [Upgrading from clibuilder 11 to 12](https://clibuilder.github.io/clibuilder/guides/upgrade-to-12/)
for what each change means and how to fix what the codemod flags.
