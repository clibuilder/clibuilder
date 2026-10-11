---
'clibuilder': minor
---

Re-export the `t` option type descriptors from `args-minus`, with the descriptor types (`Descriptor`, `AnyDescriptor`, `OutputOf`, `DescriptorData`, `DescriptorKind` and more).
An argument or option can declare its `type` with `t` instead of `z`, and `run()` gets the descriptor's exact output type.
Each declaration is parsed by its own type, so a command can mix `z` and `t`; `z` declarations behave as before.

Declarations with `t` are converted and checked by `args-minus` (`parseArgsAsync`), so converters and checks may be async.
A failure is an `invalid-value` usage error carrying the new `keyKind`, `constraint`, `allowed` (for `t.enum`) and `index` (for `t.array`) fields;
a required `t` option that is missing is a `missing-argument` error naming the option.

Help shows a `t` declaration's constraint, e.g. `[--port <int 1..65535>]`.

`UsageError` `expect-single` gains `keyKind`, the kind string of the option. Its `keyType` zod object is deprecated and is `undefined` for a `t` option.
