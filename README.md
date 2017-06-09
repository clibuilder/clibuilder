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
import { parseArgv, CommandSpec } from 'clibuilder'

export const commandA: CommandSpec = {
  name: 'echo',
  run(argv: string[]) {
    const args = parseArgv(this, argv)
    this.ui.info(args)
  }
}
```

You can override the display mechanism.

```ts
import { create, addAppender, Appender, Display } from 'clibuilder'

const yourDisplay: Display = { ... }

// You can override the display at cli level
const cli = create({
  name: 'yourcli',
  version: '1.0.0',
  commandSpecs: [],
  display: yourDisplay
})

cli.parse(process.argv)

// or your can override per command (or both)
const cli = create({
  name: 'yourcli',
  version: '1.0.0',
  commandSpecs: [{
    name: 'somecommand',
    ...,
    display: someOtherDisplay
  }],
  display: yourDisplay
})

// you can also use a different display appender
const yourOwnAppender: Appender = { ...}
addAppender(yourOwnAppender)

cli.parse(process.argv)
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
