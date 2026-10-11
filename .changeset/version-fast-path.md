---
'clibuilder': patch
---

Answer `--version` or `-v` given alone before the config loads and plugins activate, so a broken config or a hanging plugin no longer fails or delays it. The version is written to stdout as plain text. Any other invocation, such as `cli cmd --version`, is unchanged.
