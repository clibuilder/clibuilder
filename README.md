# CLI Builder

[![NPM version][npm-image]][npm-url]
[![Travis status][travis-image]][travis-url]

Building CLI based on Command Pattern.

## Usage

```ts
import { create } from 'clibuilder'

import { commandA, commandB } from './commands'

const cli = create({
  name: 'yourcli',
  version: '1.0.0',
  commands: [commandA, commandB]
})

cli.process(process.argv)

// commandA.ts
class CommandA implements Command {
  name = 'echo'
  log = createLogger('EchoCommand')
  run(argv: string[]) {
    this.log.info.apply(this.log, argv)
    return
  }
}

export const commandA: Command = new CommandA()

// commandB.ts
export const commandB = {
  name: 'echo',
  log: createLogger('EchoCommand'),
  run(argv: string[]) {
    this.log.info(...argv)
    return
  }
} as Command
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
