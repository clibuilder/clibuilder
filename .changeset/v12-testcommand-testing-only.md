---
'clibuilder': major
---

`testCommand()` is no longer exported from the root entry. Import it from `clibuilder/testing`, which 11.5.0 already has with the same signature; 11.5.0 marks the root export deprecated.

Upgrading from 11.5.0:

```diff
- import { command, testCommand } from 'clibuilder'
+ import { command } from 'clibuilder'
+ import { testCommand } from 'clibuilder/testing'
```

`@clibuilder/codemod` makes this change. `mockPluginContext()` stays in `clibuilder/testing`.

The root entry's import graph no longer reaches any test-only code, so a CLI no longer loads the test helper, the mock context and its in-memory streams when it starts. Bundled, the root entry goes from 48 to 43 modules.
