---
title: Introduction
description: What clibuilder is, and when to reach for it.
---

`clibuilder` is a library for building command line applications in Node.js. You describe your CLI as
a tree of **commands**; `clibuilder` parses `process.argv`, resolves which command was invoked,
validates the arguments and options against the schemas you declared, loads the config file if the
command asks for one, and calls your `run()`.

The core idea is that a command's declaration *is* its type. When you write:

```ts
command({
  name: 'sum',
  arguments: [{ name: 'values', description: 'values to add', type: z.array(z.number()) }],
  options: { verbose: { description: 'be chatty' } },
  run(args) {
    // args.values: number[]
    // args.verbose: boolean | undefined
  }
})
```

there is no second place to declare the shape of `args` — it is inferred from `arguments` and
`options`, using [zod](https://github.com/colinhacks/zod) (re-exported as [`z`](/clibuilder/api/zod/)).

## What it does

- **Commands and sub-commands** — `my-cli repo create` nests to any depth, with aliases. See
  [Commands](/clibuilder/guides/commands/).
- **Typed arguments and options** — declared with zod, inferred into `run(args)`, validated before
  `run()` is reached. See [Arguments & Options](/clibuilder/guides/arguments-and-options/).
- **Config files** — `JSON`, `YAML`, `cjs`, or `mjs`, resolved by convention from the CLI name, and
  validated per command against a zod schema. See [Configuration](/clibuilder/guides/configuration/).
- **Plugins** — commands published as separate packages, loaded through the config file. See
  [Plugins](/clibuilder/guides/plugins/).
- **A generated help message** — `--help` at every level, built from the descriptions you already
  wrote.
- **A UI object** — `this.ui.info/warn/error/debug`, with display level driven by `--verbose`,
  `--silent`, and `--debug-cli`. See [UI](/clibuilder/api/ui/).
- **A test helper** — [`testCommand()`](/clibuilder/api/test-command/) runs a command in-process and
  returns its result plus the messages it printed.
- **An opt-in startup cache** — [`enableCompileCache()`](/clibuilder/api/compile-cache/) turns on
  Node's V8 compile cache from your bin script.

## What's new in v8

- **Standalone CLI support.** `name` and `version` are now required options on
  [`cli()`](/clibuilder/api/cli/) rather than being read from `package.json`, so a bundled,
  single-file CLI works without shipping its manifest.
- **Plugins are loaded through config.** Earlier versions scanned `node_modules` to discover
  plugins. Now the config file lists them explicitly, which is dramatically faster to start and works
  with Yarn PnP and pnpm.
- **`keywords` drive plugin lookup.** The `plugins search` and `plugins list` commands use them.
- **ESM is distributed alongside CJS.**

## Where next

- [Installation](/clibuilder/getting-started/installation/) — add it to your project.
- [Your First CLI](/clibuilder/getting-started/first-cli/) — an end-to-end walkthrough.
- [API Reference](/clibuilder/api/) — every export, in detail.
