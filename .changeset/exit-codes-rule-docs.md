---
'clibuilder': patch
---

The `exitCodes` TSDoc and the Failing guide now state that core names only 0, 1 and 2, and that a cli sets any other exit code (1 to 255) on `CliError` and names the failure with `code`.
