---
title: build-cli skill
description: The agent skill that builds, extends and tests a command line tool with clibuilder 12.
---

The `build-cli` skill teaches an AI coding agent to build, extend and test a CLI with `clibuilder`
12. It ships in the [agent plugin](/clibuilder/agents/plugin/).

## When the agent uses it

The agent loads it when you ask for a CLI, a command, an option or a test built on `clibuilder`. For
example:

- "Build a CLI with clibuilder."
- "Add a `--port` option to my clibuilder command."
- "Make this command exit 1 with an error code."
- "Write a test for this clibuilder command."

How the output reads for an AI agent is the job of the [`axi` skill](/clibuilder/agents/axi/).

## What it covers

| Topic | Where the docs explain it |
| --- | --- |
| `cli()` and `command()`, sub-commands | [Commands](/clibuilder/guides/commands/) |
| Typed arguments and options with `t` | [Arguments & Options](/clibuilder/guides/arguments-and-options/) |
| `result()`, `empty()` and `document()` | [command()](/clibuilder/api/command/) |
| `CliError` and exit codes | [Failing](/clibuilder/guides/failing/) |
| Config files through `clibuilder/config` | [Configuration](/clibuilder/guides/configuration/) |
| Plugins through `@clibuilder/plugins` | [Plugins](/clibuilder/guides/plugins/) |
| In-process tests with `clibuilder/testing` | [Testing](/clibuilder/guides/testing/) |

## What it checks

Before the agent reports the work done, it checks the result against these criteria and reports any
that fails:

1. The entry file calls `cli()` with `name` and `version`, and calls `.parse(process.argv)` after a
   `.default()` or `.command()`.
2. Every `run` is a method, not an arrow function, so `this.ui`, `this.config` and `this.context`
   work.
3. Every typed argument or option uses a `t` builder, with constraints in the builder options.
4. Every failure in `run()` throws `CliError` with a kebab-case `code`, and no `run()` calls
   `process.exit`.
5. Each command written or changed has a test that runs it with `testCommand()` and asserts
   `exitCode`.
6. Every import names a real export of `clibuilder`, `clibuilder/axi`, `clibuilder/config`,
   `clibuilder/testing` or `@clibuilder/plugins`.

## Source

[`skills/build-cli/SKILL.md`](https://github.com/clibuilder/clibuilder/blob/main/packages/clibuilder/skills/build-cli/SKILL.md)
