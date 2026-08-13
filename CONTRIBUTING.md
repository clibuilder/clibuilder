# Contributing

## Poking at a real CLI

To try a change by hand, run one of the dummy CLIs in [`test-apps`](./test-apps):

```sh
pnpm cli --help                    # test-apps/test-cli (CJS)
pnpm cli echo hi
pnpm cli plugins list --format json
pnpm cli:esm --help                # test-apps/test-cli-esm (ESM)
```

Both scripts build `clibuilder` first (a warm `turbo` cache makes that ~0.1s),
so the workspace symlink always resolves to fresh output.

Arguments pass straight through — `pnpm` does not swallow `--help`, and no `--`
separator is needed. The build's own output goes to `stderr`, so the CLI's
`stdout` stays clean for piping; add `-s` to drop the `pnpm` banner too:

```sh
pnpm -s cli plugins list --format json | jq .plugins
```

## `clibuilder` dev dependencies

The `clibuilder` package adds the test plugins as its `devDependencies`.
For example:

```js
{
  "devDependencies": {
    "cjs-plugin": "workspace:*"
  }
}
```

This looks weird because `clibuilder` is not using those plugins even during tests.

They are used in the `test-clis` and `test-apps`.

The problem is that since `clibuilder` is a workspace package,
`pnpm` uses a symlink to reference it.
And that seems to cause issue when resolving the plugins.

My guess is that this issue only occurs in this repo.
It should be working in both actual CLI app repos and its consumer repos.

Will see if I can test that before release.
