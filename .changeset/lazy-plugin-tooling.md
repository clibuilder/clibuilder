---
"clibuilder": patch
---

Load `find-installed-packages` and `search-packages` lazily.

They are only needed by `plugins list` and `plugins search`, but `commands.ts` sits on the startup path of every CLI invocation. They are now pulled in with a dynamic `import()` at call time, cutting roughly 20ms off startup.
