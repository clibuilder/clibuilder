---
"clibuilder": patch
---

Make the built-in answers follow the AXI conventions page more closely:

- A bare command group's `missing-command` error, and the `extra-arguments` error of a group, list each sub-command with its required arguments, such as `valid commands for \`app\`: show <id>, task`.
- `--show-config` with no config found adds a `help` line that says where a config is read from. `source: none` and `config: null` are unchanged.
- The help of a command whose only option gave way to the global `--format` no longer shows an empty `Options:` section or `[options]` in its usage line.
