---
'clibuilder': major
---

Require Node.js >= 20.19 and update `find-installed-packages` to `^4.0.0`.

`engines.node` moves from `>= 18` to `>= 20.19`, matching what
`find-installed-packages@4` supports. Node 18 and 19 reached end of life, so
there is no supported runtime left below that floor.

v4 also changes how plugins are discovered. It walks the declared dependency
graph and asks the runtime's module resolver where each package lives, instead
of scanning `node_modules`. That fixes discovery under pnpm, Yarn Plug'n'Play,
and workspaces where the tree is hoisted to the repo root. The trade-off: only
*declared* dependencies are reported, so a plugin sitting in `node_modules` that
nothing depends on is no longer found — add it to your `package.json`
dependencies if you were relying on that.
