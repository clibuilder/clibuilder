---
title: Installation
description: Add clibuilder to your project.
---

```sh
# npm
npm install clibuilder

# yarn
yarn add clibuilder

# pnpm
pnpm add clibuilder

# rush
rush add -p clibuilder
```

## Requirements

- **Node.js 20.19 or newer.**
- **TypeScript is optional but recommended.** The type inference in `run(args)` is the main reason to
  use `clibuilder` over a hand-rolled parser; in plain JavaScript everything still works, you just
  don't see the inferred types.

## Module formats

`clibuilder` 11 publishes both ESM and CJS. `clibuilder` 12 (unreleased) publishes ESM only, and
`require('clibuilder')` still works through Node's `require(esm)`, which Node.js 20.19 and newer have
unflagged. Either of these works:

```ts
// ESM
import { cli, command, t } from 'clibuilder'
```

```js
// CJS
const { cli, command, t } = require('clibuilder')
```

## Types

Arguments and options declare their `type` with [`t`](/clibuilder/api/t/), which `clibuilder`
exports. You install nothing for it.

```ts
import { t } from 'clibuilder'
```

:::note[v12, unreleased]
Before `clibuilder` 12, types came from zod, re-exported as `z`. See
[zod is replaced by `t`](/clibuilder/guides/upgrade-to-12/#zod-is-replaced-by-t).
:::

## Optional packages

A command's `config` takes any [Standard Schema](https://standardschema.dev). Install the library
you pick as your own dependency, for example `npm install zod`.

`js-yaml` is an optional peer dependency. If your users write a `.yaml` or `.yml` config file,
install it too:

```sh
npm install js-yaml
```

Without it, reading a YAML config fails with a `CliError` whose code is `missing-peer-dependency`.
JSON, JSONC, `cjs` and `mjs` config files need nothing extra.

## Next

Build something with it: [Your First CLI](/clibuilder/getting-started/first-cli/).
