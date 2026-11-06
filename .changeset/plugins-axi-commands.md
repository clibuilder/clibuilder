---
"@clibuilder/plugins": minor
---

The `plugins` commands follow the AXI conventions page under `output: 'axi'`:

- A bare `plugins` answers with the installed plugins followed by the group's own `commands`, instead of a `missing-command` error. A sub-command a host adds to the group is listed too. Under `output: 'console'` it still prints its help and exits with code 2.
- `plugins list`, `plugins search` and a bare `plugins` cut a list longer than 20 entries, add `count: 20 of 47 total`, and offer `--full`, a new option that shows every entry.
- Next steps are complete command lines checked against the command tree, such as ``Run `my-cli plugins search` to find plugins to install``. A next step is offered only when the command it names is in the group.
- A registry search that fails is a `CliError` with code `registry-search-failed` and exit code 1, reported in the caller's format, instead of an uncaught error.
