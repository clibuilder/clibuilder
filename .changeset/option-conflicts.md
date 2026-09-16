---
'clibuilder': minor
---

Add `conflicts` to an option entry to declare options that cannot be used together.
Passing both is a usage error (exit code 2), reported as a `conflicting-options` entry in the `lookupCommand` error list.
A default value does not count as passed, aliases are resolved, and the help message lists the conflict on both options.
