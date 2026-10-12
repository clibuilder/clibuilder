# CLI Builder

[![NPM version][npm-image]][npm-url]
[![NPM downloads][downloads-image]][npm-url]

[![GitHub Release][github_release]][github-action-url]

[![Documentation][docs-image]][docs-url]

[![Visual Studio Code][vscode-image]][vscode-url]
[![Wallaby.js][wallaby-image]][wallaby-url]

A highly customizable command line builder.

## What's new in v8

Key highlights:

- Support standalone CLI
  - `name` and `version` are now required and not read from `package.json`.
- Plugins are loaded through config (in v12, by `@clibuilder/plugins`)
  - This drastically improve startup time, as it does not scan `node_modules` anymore.
  - Also better support other package manager such as `yarn PnP` and `pnpm`.
- `keywords` are now used for plugin lookup (in v12, an option of `plugins()`).
- Distribute `ESM` along with `CJS` (in v12, `ESM` only; `require()` still works on Node.js 20.19+ through `require(esm)`).

## Feature Highlights

- support default commands and sub-commands `my-cli cmd1 cmd2 cmd3`
- configuration file support
- plugin support through `@clibuilder/plugins`: write commands in separate packages and reuse by multiple CLI
- type inference for arguments and options with the `t` descriptors (exported as `t`),
  and config validation with any [Standard Schema](https://standardschema.dev) such as zod or valibot
- opt-in V8 compile cache for faster startup\
  via `clibuilder/compile-cache`

## Documentation

📖 **<https://clibuilder.github.io/clibuilder/>** — guides for commands, arguments and options,
config files, plugins, testing, and publishing, plus the full API reference.

The site lives in [`apps/website`](./apps/website). To work on it:

```sh
pnpm web dev      # local dev server
pnpm web build    # production build into apps/website/dist
```

Learn more in the [`clibuilder` README](./packages/clibuilder/README.md)

[docs-image]: https://img.shields.io/badge/docs-clibuilder.github.io-blue.svg?style=flat
[docs-url]: https://clibuilder.github.io/clibuilder/
[downloads-image]: https://img.shields.io/npm/dm/clibuilder.svg?style=flat
[github_release]: https://github.com/clibuilder/clibuilder/actions/workflows/release.yml/badge.svg
[github-action-url]: https://github.com/clibuilder/clibuilder/actions
[npm-image]: https://img.shields.io/npm/v/clibuilder.svg?style=flat
[npm-url]: https://npmjs.org/package/clibuilder
[vscode-image]: https://img.shields.io/badge/vscode-ready-green.svg
[vscode-url]: https://code.visualstudio.com/
[wallaby-image]: https://img.shields.io/badge/wallaby.js-configured-green.svg
[wallaby-url]: https://wallabyjs.com
