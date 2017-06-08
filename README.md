# CLI Builder

[![NPM version][npm-image]][npm-url]
[![Travis status][travis-image]][travis-url]

Building CLI based on Command Pattern.

## Usage

```ts
// bin.ts
import { create } from 'clibuilder'

import { commandA, commandB } from './commands'

const cli = create('yourcli', '1.0.0', [commandA, commandB])
cli.parse(process.argv)

// commands.ts
import { createCommandCommand, createLogger } from 'clibuilder'

export const commandA = createCommand({
  name: 'echo',
  run(argv) {
    this.ui.info(...argv)
  }
})

```

## Contribute

```sh
# right after fork
npm install

# begin making changes
npm run watch

```

[npm-image]: https://img.shields.io/npm/v/clibuilder.svg?style=flat
[npm-url]: https://npmjs.org/package/clibuilder
[travis-image]: https://travis-ci.org/unional/clibuilder.svg?branch=master
[travis-url]: https://travis-ci.org/unional/clibuilder
