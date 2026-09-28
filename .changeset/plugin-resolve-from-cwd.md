---
'clibuilder': patch
---

Resolve a plugin from the working directory, where the project that lists it installed it. A cli run through `npx` or a global install, or one that inlines clibuilder into its own bundle, could not load a plugin from the project's `node_modules` before this.
