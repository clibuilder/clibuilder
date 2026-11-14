---
title: axi skill
description: The agent skill that designs or reviews CLI output for AI agents, following clibuilder's version of the AXI conventions.
---

The `axi` skill teaches an AI coding agent clibuilder's version of the
[AXI conventions](/clibuilder/getting-started/axi/): the ten upstream rules plus three changes. It
ships in the [agent plugin](/clibuilder/agents/plugin/).

## When the agent uses it

The agent loads it when you design or review the output of a CLI that an AI agent reads. For
example:

- "Make my CLI agent-friendly."
- "Review this command's output for agents."
- "Apply AXI to this CLI."
- "What should this command print when nothing is found?"

For a CLI built on `clibuilder`, the agent uses the helpers in
[`clibuilder/axi`](/clibuilder/api/axi/). For a CLI not built on `clibuilder`, the rules still
apply, and the agent implements each one by hand.

Building the CLI itself is the job of the [`build-cli` skill](/clibuilder/agents/build-cli/).

## Reviews

When you ask for a review, the agent reports each rule or change the CLI breaks by its number, with
the command, what it prints now, and the fix. The numbers match the
[AXI Conventions](/clibuilder/getting-started/axi/) page.

## What it checks

Before the agent reports the work done, it checks the result against these criteria and reports any
that fails:

1. A bare call to the CLI or to a group returns live data, not a manual.
2. Every list answer has a count and few fields per item, and a list that can be cut takes `--full`
   through `fullOption`.
3. Every empty answer comes from `empty()` or `orEmpty()`, with a message that names the zero.
4. Every failure throws `CliError` with a `code` and a `help` line, and nothing prompts.
5. Every suggested next step is a `ref()` to an action that is valid for the object returned.
6. A review names each broken rule or change by its number.

## Source

[`skills/axi/SKILL.md`](https://github.com/clibuilder/clibuilder/blob/main/packages/clibuilder/skills/axi/SKILL.md)
