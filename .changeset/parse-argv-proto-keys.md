---
"clibuilder": patch
---

Fix a crash on option names that exist on `Object.prototype`.
`--constructor`, `--__proto__`, `--toString`, `--hasOwnProperty`, `--valueOf` and similar names threw `TypeError: args[key].push is not a function`.
They now work like any other option: an undeclared one is reported as an unknown option, and a declared one gets its value.
A config key with such a name that fails validation is reported like any other key, instead of throwing.
