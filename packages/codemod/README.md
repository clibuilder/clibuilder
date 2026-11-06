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

It prints [TOON](https://github.com/toon-format/toon) on stdout: how many files it scanned, changed,
rewrote, flagged and left for review, then the flagged and review findings as `file:line:column`, 30 at
most, and the next steps that apply.

| Option | Meaning |
| --- | --- |
| `--dry-run` | print a unified diff on stdout and write nothing; the report goes to stderr |
| `--add-plugins` | add `.use(plugins())`, after `.use(config())`, to every `cli()` that sets `config`. Without it, the codemod flags those calls with a `TODO(clibuilder-12)` comment, since 12 no longer loads plugins from `config` |
| `--full` | list every finding, not the first 30 |
| `--format` | `toon` (default), `json`, or `text` for the prose report |

It exits `0` on success, `1` when a file could not be read or parsed, and `2` for a usage error such as
a missing path.

See [Upgrading from clibuilder 11 to 12](https://clibuilder.github.io/clibuilder/guides/upgrade-to-12/)
for what each change means and how to fix what the codemod flags.
