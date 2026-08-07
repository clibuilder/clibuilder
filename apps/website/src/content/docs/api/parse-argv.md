---
title: parseArgv()
description: The raw argv tokenizer clibuilder uses internally, exported for reuse.
---

```ts
function parseArgv(argv: string[]): parseArgv.Result
```

Tokenizes a `process.argv` into positionals and raw option values. This is the first stage of what
[`parse()`](/clibuilder/api/cli/#parseargv) does — it knows nothing about your commands, schemas, or
types. You rarely need it directly; it is exported because it is useful on its own.

```ts
import { parseArgv } from 'clibuilder'

parseArgv(['node', 'app', 'build', '--watch', '--out', 'dist'])
// { _: ['build'], watch: ['true'], out: ['dist'] }
```

## Result

```ts
namespace parseArgv {
  type Result = { _: string[]; __?: string[] } & Record<string, string[]>
}
```

| Key | Contents |
| --- | --- |
| `_` | Positional values, in order |
| *(option name)* | Every value given for that option, as raw strings — always an array |
| `__` | Present when a bare `--` was seen; holds everything after it |

Every option value is an array because an option may legitimately appear more than once. Whether that
is allowed, and what the strings mean, is decided later against the command's declared types.

## What it recognizes

| Input | Result |
| --- | --- |
| `value` | Appended to `_` |
| `--flag` | `{ flag: ['true'] }` |
| `--key=value` | `{ key: ['value'] }` |
| `--key value` | `{ key: ['value'] }` |
| `--key a b` | `{ key: ['a', 'b'] }` |
| `-abc` | `{ a: ['true'], b: ['true'], c: ['true'] }` |
| `-abc=value` | `{ a: ['true'], b: ['true'], c: ['value'] }` |
| `--` | Everything after it lands in `__` |

The first two entries of `argv` are skipped — it expects a full `process.argv`.

:::caution
A bare `--` is tokenized into `__`, but `clibuilder`'s own command resolution does not forward it to
`run()`; a command line containing `--` is treated as a usage error and prints the help message. If
you need to pass a trailing command line through to another program, take it as a string option
(`--exec "npm test"`) rather than relying on `--`.
:::
