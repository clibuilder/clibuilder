# CLI Builder

[![NPM version][npm-image]][npm-url]
[![Travis status][travis-image]][travis-url]

Building CLI based on Command Pattern.

## Usage

```ts
import { Cli } from 'clibuilder'

import { commandA, commandB } from './commands'

const cli = new Cli('yourcli', '1.0.0',[commandA, commandB])

cli.run(process.argv)

// commandA.ts
class CommandA extends Command {
  name = 'echo'
  log = createLogger('EchoCommand')
  run(argv: string[]) {
    this.log.info.apply(this.log, argv)
  }
}

export const commandA = new CommandA()

```

Although more verbose, I would prefer `commandA` approach as it provides better type support on `this`.

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
