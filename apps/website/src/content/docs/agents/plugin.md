---
title: Agent Plugin
description: Install the clibuilder agent plugin so your AI coding agent builds CLIs with clibuilder and shapes their output for agents.
---

`clibuilder` ships an agent plugin for AI coding agents. It gives the agent two skills:

| Skill | What it does |
| --- | --- |
| [`build-cli`](/clibuilder/agents/build-cli/) | Builds, extends and tests a CLI with `clibuilder`, using only its real exports. |
| [`axi`](/clibuilder/agents/axi/) | Designs or reviews CLI output that an AI agent reads, following clibuilder's version of the [AXI conventions](/clibuilder/getting-started/axi/). |

The plugin works with Claude Code, Codex, GitHub Copilot CLI and Cursor.

:::note[Since 12.4.0]
The plugin first ships with `clibuilder` 12.4.0.
:::

This plugin is for the agent that writes your code. It has nothing to do with
[clibuilder plugins](/clibuilder/guides/plugins/), which add commands to a CLI you build.

## Install

The plugin is listed in the [cyber-uni marketplace](https://github.com/cyber-uni/marketplace). Add
the marketplace once, then install the plugin from it.

**Claude Code**

```
/plugin marketplace add cyber-uni/marketplace
/plugin install clibuilder@cyber-uni
```

**Codex**

```sh
codex plugin marketplace add cyber-uni/marketplace
codex plugin add clibuilder@cyber-uni
```

**GitHub Copilot CLI**

```sh
copilot plugin marketplace add cyber-uni/marketplace
copilot plugin install clibuilder@cyber-uni
```

**Cursor** has no command that adds a repository catalog. An admin imports
`cyber-uni/marketplace` as a team marketplace, and members install `clibuilder` from it.

Start a new agent session after you install it.

## Use it

You do not call the skills by name. Ask for the work, and the agent loads the skill that fits:

- "Build a CLI with clibuilder that lists my open tasks" loads `build-cli`.
- "Add a `--port` option to my serve command" loads `build-cli`.
- "Make this CLI's output agent-friendly" loads `axi`.
- "What should `task list` print when nothing is found?" loads `axi`.

In Claude Code you can also call one directly, such as `/clibuilder:build-cli`.

## Source

The skills live in
[`packages/clibuilder/skills`](https://github.com/clibuilder/clibuilder/tree/main/packages/clibuilder/skills).
They are written from these docs, so they change when the docs do.
