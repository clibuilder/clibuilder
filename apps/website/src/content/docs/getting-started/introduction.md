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
  arguments: [{ name: 'values', description: 'values to add', type: t.array(t.number()) }],
  options: { verbose: { description: 'be chatty' } },
  run(args) {
    // args.values: number[]
    // args.verbose: boolean | undefined
  }
})
```

there is no second place to declare the shape of `args` — it is inferred from `arguments` and
`options`, using the [`t`](/clibuilder/api/t/) type descriptors.

`clibuilder` is built on [`args-minus`](/clibuilder/packages/args-minus/), a dependency-free argument
parser that you can also use on its own in Node.js, Deno and Bun.

## What it does

- **Commands and sub-commands** — `my-cli repo create` nests to any depth, with aliases. See
  [Commands](/clibuilder/guides/commands/).
- **Typed arguments and options** — declared with `t`, inferred into `run(args)`, validated before
  `run()` is reached. See [Arguments & Options](/clibuilder/guides/arguments-and-options/).
- **Config files** — `JSON`, `YAML`, `cjs`, or `mjs`, resolved by convention from the CLI name, and
  validated per command against any Standard Schema. See [Configuration](/clibuilder/guides/configuration/).
- **Plugins** — commands published as separate packages, loaded by [`@clibuilder/plugins`](/clibuilder/packages/plugins/)
  when a CLI opts in. See
  [Plugins](/clibuilder/guides/plugins/).
- **A generated help message** — `--help` at every level, built from the descriptions you already
  wrote.
- **A UI object** — `this.ui.info/warn/error/debug`, with display level driven by `--verbose`,
  `--silent`, and `--debug-cli`. See [UI](/clibuilder/api/ui/).
- **A test helper** — [`testCommand()`](/clibuilder/api/test-command/) runs a command in-process and
  returns its result plus the messages it printed.
- **An opt-in startup cache** — [`enableCompileCache()`](/clibuilder/api/compile-cache/) turns on
  Node's V8 compile cache from your bin script.

## What's new in v12

- **Agent-facing output is the default.** With [`output: 'axi'`](/clibuilder/api/cli/#streams-and-output),
  the value `run()` returns is printed on stdout in the format the caller asks for with `--format`
  (`toon`, `json` or `text`). A `CliError` or a usage error is reported once, with a code, and every
  `ui.*` message is a diagnostic on stderr. `output: 'console'` keeps the 11 behaviour, and is not
  deprecated.
- **`t` replaces zod.** Arguments and options declare their type with [`t`](/clibuilder/api/t/), and
  `config` takes any Standard Schema from your own dependency.
- **A slimmer core.** Config loads through [`.use(config())`](/clibuilder/api/config/), plugins
  through [`@clibuilder/plugins`](/clibuilder/packages/plugins/), and the AXI helpers come from
  [`clibuilder/axi`](/clibuilder/api/axi/).

See [Upgrading to 12](/clibuilder/guides/upgrade-to-12/) for every change, with the fix for each and
a codemod for the mechanical parts.

## Where next

- [AXI Conventions](/clibuilder/getting-started/axi/) — the agent-facing output rules `clibuilder` follows.
- [Installation](/clibuilder/getting-started/installation/) — add it to your project.
- [Your First CLI](/clibuilder/getting-started/first-cli/) — an end-to-end walkthrough.
- [API Reference](/clibuilder/api/) — every export, in detail.
