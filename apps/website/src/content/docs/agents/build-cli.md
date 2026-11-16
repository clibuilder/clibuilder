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
- "Write the spec for this clibuilder command."
- "Write a test for this clibuilder command."

How the output reads for an AI agent is the job of the [`axi` skill](/clibuilder/agents/axi/).

## How it works

For each command it creates or changes, the agent works spec first:

1. **Spec the command.** It writes the command's spec, a Markdown file beside the command, or updates it with the
   change. The spec names the command's default `--format` (`toon`, `json` or `text`), also when it is the CLI's
   default, so a reader of that command's spec finds it there.
2. **Derive the tests from the spec.** It writes one test per spec criterion, the title opening with the criterion's
   ID, including a test that runs the command without `--format` and checks the default.
3. **Implement the command.**
4. **Verify.** It runs the tests and checks the result against the criteria below.

When it changes an existing command, it first compares the command's default format in its spec, its tests and the
entry file's `cli({ format })`. When they disagree, it reports each place and the default it gives, and asks which is
right instead of picking one.

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
7. Each command written or changed has a spec that names its default `--format` as `toon`, `json` or `text`.
8. Each criterion ID in a command's spec opens the title of a test of that command.
9. Each command written or changed has a test that runs it with no `--format` and asserts an answer in the default
   its spec names.
10. When an existing command's spec, tests and entry file disagree on its default format, the agent names each place
    and the default it gives, and changes no file's default.

## Source

[`skills/build-cli/SKILL.md`](https://github.com/clibuilder/clibuilder/blob/main/packages/clibuilder/skills/build-cli/SKILL.md)
