# Contributing

## Setup

Node and pnpm are pinned in `mise.toml` and managed by [mise](https://mise.jdx.dev):

```sh
mise install  # node 24 + pnpm 12 at the pinned versions
pnpm install
pnpm verify   # lint + build + coverage + depcheck + size, then the test-apps
```

CI does not read `mise.toml`: it takes node from `.node-version` and pnpm from
`packageManager` in `package.json`. Keep the three in step.

## Poking at a real CLI

To try a change by hand, run one of the dummy CLIs in [`test-apps`](./test-apps):

```sh
pnpm cli --help                    # test-apps/test-cli (CommonJS consumer)
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

The test-apps are also tested: `test-cli` and `test-cli-esm` run their real bin in a
child process (`bin.test.mjs`, with `node --test`), and `ts-app` type checks against
the built `clibuilder` types (`tsc`). `pnpm verify:apps` runs them, and `pnpm verify` runs
it last.

The packages are ESM-only. `test-cli` is the CommonJS consumer: its bin and `entries.test.js`
load every entry point with `require()`, which works through `require(esm)` on Node 20.19 and later.
`no-top-level-await.test.js` fails when a module reachable from a public entry point uses
top-level await, because that makes `require()` throw. `test-cli-esm` is the ESM consumer.

CI also runs `test-cli` on Node 20.19.0, the `engines` floor. To do the same locally, build first,
then run its tests with mise:

```sh
pnpm build
cd test-apps/test-cli
mise exec node@20.19.0 -- node --test bin.test.mjs axi.test.mjs entries.test.js no-top-level-await.test.js
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
