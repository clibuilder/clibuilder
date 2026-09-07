---
'clibuilder': major
---

Pin `type-plus` to `8.0.0-beta.10`.

Published `clibuilder@10.1.0` declares `type-plus: ^7.0.0`. Consumers that also
depend on the type-plus 8 line — `mocktomata` and `node-supported-releases`
resolve type-plus *through* clibuilder — end up with two majors of type-plus
(and of `tersify`) in one tree. This release moves clibuilder onto 8.

This is a **major** for two independent reasons:

1. type-plus types leak into clibuilder's emitted declarations. `esm/cli.d.ts`,
   `esm/builder.d.ts` and `esm/state.d.ts` all `import type ... from 'type-plus'`
   (`RequiredPick`, `UnionOfValues`), so consumers compile against type-plus 8
   directly and inherit its new `peerDependencies: { typescript: '>= 5.6.0' }`.
   type-plus 5, 6 and 7 declared no typescript peer at all.
2. The repo's TypeScript range moves from `^5.0.4` to `^5.9.3`. Independently of
   type-plus, that raises the compiler floor for anyone building against these
   declarations.

`type-plus` is pinned exactly rather than caret-ranged. `^8.0.0-beta.10` resolves
to `>=8.0.0-beta.10 <9.0.0-0`, admitting every later 8.0.0 prerelease plus
`8.0.0` and `8.1.0`. The 8 line is a prerelease line where breaking changes land
between betas — beta.10 to beta.11 changed `Equal`'s signature and removed
`isType.f`. An exact version makes each bump a reviewable PR instead of something
a lockfile refresh can do silently.

Also bumps the `tersify` devDependency to `^4`, matching the copy type-plus 8 and
`assertron@11.6` already bring in. `engines.node` is unchanged at `>= 20.19`,
which already satisfies the `>= 20` that type-plus 8's `unpartial@^1.0.7`
dependency requires.
