---
"clibuilder": minor
---

`--help` is scoped to the node ([AXI conventions, change 2](https://clibuilder.github.io/clibuilder/getting-started/axi/#change-2-disclosure-scoped-to-the-node)).

A group's `--help` gives each sub-command's full signature, such as `add <name: string> [-f|--force]`, in the text `Commands:` section and as `usage` on each `commands` entry of the structured help. `name`, `aliases` and `description` stay.

Only the root's `--help` lists every global option in full. Any other node's structured help lists `help` and `format` under `globalOptions` and names the rest under the new `otherGlobalOptions`; `<cli> --help` describes them. The text help of a non-root node already left the global options out.

Migration: a consumer that read `version`, `verbose`, `silent`, `debug-cli` or an extension's option from `globalOptions` of a sub-command's help should read the root's help instead.
