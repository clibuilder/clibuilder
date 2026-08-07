---
'clibuilder': patch
---

Fix optional and variadic arguments in the help output.

The `Arguments:` section tested the `isOptional` *method* instead of calling it, so a typed required
argument rendered as `[name]` and an optional one as `<name>`, exactly backwards. Arguments now use
the same notation as options: `<name>` when required, `[name]` when optional, with the declared type
(`=string`, `=number`, `=boolean`) and a `...` variadic marker.

```
Arguments:
  <src=string>           the source
  [host=string]          the host
  <files=string...>      the files
```
