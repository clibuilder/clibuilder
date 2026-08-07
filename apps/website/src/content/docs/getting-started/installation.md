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

- **Node.js 18 or newer.**
- **TypeScript is optional but recommended.** The type inference in `run(args)` is the main reason to
  use `clibuilder` over a hand-rolled parser; in plain JavaScript everything still works, you just
  don't see the inferred types.

## Module formats

`clibuilder` publishes both ESM and CJS, so either of these works:

```ts
// ESM
import { cli, command, z } from 'clibuilder'
```

```js
// CJS
const { cli, command, z } = require('clibuilder')
```

## zod

`clibuilder` depends on [zod](https://github.com/colinhacks/zod) and re-exports it as
[`z`](/clibuilder/api/zod/). Import it from `clibuilder` rather than installing zod separately —
that guarantees the schemas you build are the same zod instance the library validates with.

```ts
import { z } from 'clibuilder'
```

## Next

Build something with it: [Your First CLI](/clibuilder/getting-started/first-cli/).
