---
'clibuilder': patch
---

Take only as many tokens after an option as its type allows, so `<cmd> --flag value <positional>` works.

A string, number, or enum option takes one following token.
A boolean option takes none, unless the token is `true` or `false`.
An array option still takes every following token.
The other tokens are positionals.
Before, `read --lines 5 %1` failed with `--lines expects a single value`, and `read --full %1` failed with `expected to be boolean`.
