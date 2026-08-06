---
"clibuilder": minor
---

Resolve the config file with a single upward directory walk instead of one walk per candidate name.

`getConfigFilenames()` produces ~28 candidate names, and each one used to be searched with its own
`findUpSync()` call — 28 walks from `cwd` to the filesystem root to answer one question. Each ancestor
directory is now read once and matched against every candidate. From a directory 13 levels below the
config, the lookup drops from 165 `stat` calls to 13 `readdir` calls (~0.51 ms to ~0.15 ms); when no
config exists, from 580 `stat` calls to 40.

**Behavior change — nearest config now wins.** Because candidates used to be searched one full walk at
a time, a lower-priority name in a *nearer* directory lost to a higher-priority name in a *farther*
one: a `foorc.json` in a grandparent beat a `foo.yaml` in the current directory. Resolution is now
directory-first — the nearest ancestor containing any candidate wins, and the candidate order only
breaks ties within that directory. This matches how other config loaders behave. Projects with config
files at more than one level of the tree may now load a different file.

`find-up` is no longer a dependency; the walk used for `package.json` lookup moved to an internal
helper as well.
