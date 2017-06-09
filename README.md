# CLI Builder

[![NPM version][npm-image]][npm-url]
[![Travis status][travis-image]][travis-url]

Building CLI based on Command Pattern.

## Usage

```ts
// bin.ts
import { Cli } from 'clibuilder'

import { commandA, commandB } from './commands'

const cli = new Cli('yourcli', '1.0.0', [commandA, commandB])
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

You can override the display mechanism:

```ts
import { Cli, PlainReportPresenter, ReportPresenter } from 'clibuilder'

class YourPresenter extends PlainReportPresenter { ... }

class AnotherPresenter implements ReportPresenter { ... }

// You can override the display at cli level
Cli.ReportPresenterClass = YourPresenter

const cli = new Cli('yourcli', '1.0.0', [])

cli.parse(process.argv)

// or your can override per command (or both)
const cli = new Cli('yourcli', '1.0.0', [{
    name: 'somecommand',
    ...,
    ReportPresenterClass: AnotherPresenter
  }]
})

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
