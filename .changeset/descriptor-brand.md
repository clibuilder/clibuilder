---
'args-minus': patch
'clibuilder': patch
---

Accept option descriptors from another copy of `args-minus` in the same process.
`isDescriptor()` now checks a `Symbol.for('args-minus.descriptor')` brand that carries the descriptor format version, instead of prototype identity,
so a CLI that bundles clibuilder no longer rejects the commands of plugins built against their own `args-minus` (#711).
