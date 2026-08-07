# RFC: a plugin registration channel beyond `addCommand`

- **Status:** Proposed — awaiting Council decision
- **Issue:** [#551](https://github.com/clibuilder/clibuilder/issues/551)
- **Prior art:** [#191](https://github.com/clibuilder/clibuilder/issues/191) (closed)
- **Affects:** `PluginActivationContext` (`packages/clibuilder/ts/cli.ts:186`), `activatePlugin` (`packages/clibuilder/ts/plugins.ts:56`)
- **Scope:** the plugin registration channel only. Not command anchor points, not a DI container, not plugin discovery.

## 1. Summary

Widen `PluginActivationContext` from `{ addCommand }` to `{ addCommand, register, get, has, host }`, backed by a
single shared keyed registry owned by the host CLI. Keys are nominal, string-identity tokens declared in a
contracts package that both host and plugins depend on. Keys come in two kinds — **single-value** (capability
ports) and **collection** (content contributions) — which is what lets one channel serve both use cases in #551
without pretending their collision semantics are the same.

Resolution is **lazy**: plugins read the registry when a command *runs*, not while it activates. That single choice
removes the ordering problem, so we do not need a topological sort, a scheduler, or a container. Config order
remains the only ordering rule, and it stops mattering for the common case.

`activate` becomes `void | Promise<void>`, awaited sequentially. This costs nothing at the public API boundary
because `builder()` already awaits plugin loading before `parse()` resolves.

Everything here is additive. Existing plugins compile and run unchanged. Ship as a **minor**.

## 2. The problem, restated from the code

```ts
// packages/clibuilder/ts/cli.ts:186
export type PluginActivationContext = {
  addCommand<...>(command: cli.Command<...>): void
}
```

```ts
// packages/clibuilder/ts/plugins.ts:56
function activatePlugin(m: { activate: (context: PluginActivationContext) => void }) {
  const commands: cli.Command[] = []
  m.activate({ addCommand: (cmd) => commands.push(cmd) })
  return commands
}
```

A plugin has exactly one thing it can hand back, and it must be a `cli.Command`. `activate`'s return value is
discarded. Two use cases hit this same wall from different directions:

1. **Content federation** (#551 body). `cyber-skills governance show changeset-authoring` must resolve content
   published by `@repobuddy/agent-changesets`. The plugin contributes *data*, and the host merges it into its own
   namespace. Contribution is one-way; the plugin never reads back.
2. **Capability federation** (#551 comment). repobuddy splits into capability packages; split-verification needs
   affected-set. Today the choices are importing the sibling package directly — which makes the plugin boundary
   decorative and defeats the point of keeping the forge adapter optional — or shelling out to the host CLI, which
   is a real contract but pays process-spawn cost on a hot path. The plugin needs to both contribute *and* consume.

The common shape is "register something that is not a command." The difference — one-way contribution vs.
two-way port — is real and shows up later in collision rules and ordering, but it does not justify two channels.

### Three facts from the code that shape the design

**(a) The host API is already async at the boundary that matters.** `builder()` pushes plugin loading into
`pending` (`builder.ts:29`) and `parse()` awaits it (`builder.ts:57`). Plugin modules are already loaded with a
concurrent `await Promise.all` of dynamic `import()` (`plugins.ts:9`). The only synchronous step is the `forEach`
that calls `activate` (`plugins.ts:28`). Allowing `activate` to return a promise therefore does not make any
public API async that is not async already — it makes one internal loop `for...of` + `await`.

**(b) Deterministic ordering already exists and is cheap.** Activation walks `pluginNames` in config order.
Whatever ordering guarantee we want, we already have the strongest one available without a scheduler: the user's
own config array.

**(c) There is no public constructor for `PluginActivationContext`.** The host builds it inline in
`activatePlugin`. `mockContext` (`context.mock.ts`) mocks `Context`, not the activation context, and
`testCommand` never touches it. This is why widening the type is a minor, not a major — see §8.

## 3. Prior art: what #191 tells us

#191 ("Use case analysis: Pluggable Command", closed 2019-02-04) proposed **anchor points inside a command** that
plugins could hook to influence that command's outcome. It was closed with: *"It is too application specific. And
it applies to `Cli`, not only `PluginCli`."*

**What carries over:**

- The rejection reason is the design constraint, not an obstacle to route around. Anchor points failed because
  they required *clibuilder* to hold the semantics of an extension point — what an anchor means, when it fires,
  what it may mutate. Any design that makes clibuilder define the meaning of a contribution will fail the same
  test. The registry proposed here defines **no keys of its own**; hosts declare keys, hosts define semantics,
  clibuilder provides identity, storage, provenance, and collision policy. That is the mechanism/semantics split
  #191 was actually asking for.
- The second objection survives too, transposed. "It applies to `Cli`, not only `PluginCli`" is obsolete in
  today's API — there is one `cli()` builder and the `PluginCli`/`Cli` split is gone. But its content is live: an
  extension mechanism must be reachable from *host-authored* commands as well as plugin-authored ones. That is a
  direct argument for exposing the registry on the command's `this` at run time (§5.4), not only on the
  activation context.

**What does not carry over:**

- Anchor points, hooks, taps, and any notion of a plugin altering another command's behavior mid-execution. That
  is webpack/Rollup territory and it is out of scope here. A plugin registers a value; the consumer decides what
  to do with it. Nothing intercepts anything.
- Hook execution ordering, priorities, `enforce: 'pre' | 'post'`. Not needed, because nothing is a hook.
- Any clibuilder-owned extension-point vocabulary.

## 4. How comparable systems solved this

Not to copy — to extract the tradeoff each chose and what it cost.

| System | Channel | Ordering | Cross-package typing | Collision | Cost it paid |
| --- | --- | --- | --- | --- | --- |
| **Fastify** | `decorate(name, value)` on the shared instance | `await register()`, `fastify-plugin` declares `dependencies` + a supported `fastify` range, validated at boot | none — `name` is a string, augmented via `declare module` | **throws** on duplicate | Boot-time hard failure; encapsulation contexts are a second concept users must learn before decorators make sense |
| **VS Code** | `activate()` **returns** an API object, read via `extensions.getExtension(id).exports` | `activationEvents` + `extensionDependencies` | `exports` is `any`; consumers hand-write types or depend on a published `-types` package | n/a — keyed by extension id, so no collisions by construction | Extension-to-extension API is documented as unsupported/at-your-own-risk; in practice the type story never got solved |
| **ESLint (flat config)** | plugins are **plain objects** (`{ rules, processors, configs }`); no `activate` at all | array order in the config file | shared `@types/eslint` shapes | **the config author names the key** (`plugins: { foo: fooPlugin }`), so collisions are resolved by the user, not the framework | Plugins cannot consume each other at all; every cross-plugin need becomes a shared npm dependency |
| **Vite/Rollup** | `PluginContext` for build ops; ad-hoc `plugin.api` field for plugin-to-plugin | array order + `enforce: 'pre' \| 'post'` | none — consumers scan `config.plugins` by name and cast | last writer wins, undocumented | `api` is an untyped convention that grew by accident; every consumer reimplements lookup |
| **Babel** | plugin function receives `api`, calls `api.assertVersion(7)` | array order | n/a | n/a | Nearly free; only answers "is the host new enough", nothing else — but that turned out to be most of what was needed |
| **oclif** | commands and topics only | manifest order | n/a | command id collision → last plugin wins | Never solved capability sharing; the escape hatch is importing the sibling package, which is exactly the concretion #551 is trying to avoid |
| **OSGi / Eclipse** | extension points **and** a service registry, with version ranges on both | full dependency resolution | interfaces in shared bundles | explicit policy per extension point | The ceiling: correct, and paid for with a resolver, a lifecycle, and classloader complexity that no CLI library should import |

**What the survey actually settles:**

- **Fastify is the closest analogue** and validates the core shape: a shared registry keyed on the context object
  is sufficient; you do not need a container. But its throw-on-duplicate is wrong for our audience (§5.3).
- **ESLint's insight is the good one** and is underrated: when the *config author* names the key, collisions stop
  being the framework's problem. We cannot adopt it wholesale — our keys are typed contracts, not user labels —
  but it argues for making the config file the tiebreaker, which first-wins does.
- **VS Code's `activate` return** is the design #551 might reach for first, and its failure mode is instructive:
  returning an untyped blob means the type never crosses the package boundary, and it stayed `any` for a decade.
  If we widen the channel, we must solve typing at the same time or we ship VS Code's problem.
- **Babel's `assertVersion`** shows the cheapest useful version handshake and sets the bar for §5.6: anything more
  than "can the plugin tell how old the host is" needs to justify itself.

## 5. Proposal (Recommendation A)

### 5.1 The primitive

```ts
declare const KeyValue: unique symbol

/** A nominal, string-identity registry key carrying its value type. */
export type RegistryKey<T> = string & { readonly [KeyValue]: T }

/** A key holding exactly one value. First registration wins. */
export type ValueKey<T> = RegistryKey<T> & { readonly kind: 'value' }

/** A key accumulating contributions from many plugins, in config order. */
export type CollectionKey<T> = RegistryKey<T> & { readonly kind: 'collection' }

export function defineKey<T>(key: string): ValueKey<T>
export function defineCollectionKey<T>(key: string): CollectionKey<T>

export type Contribution<T> = {
  /** The plugin name as it appears in the config `plugins` array. */
  readonly source: string
  readonly value: T
}

export type PluginActivationContext = {
  addCommand<...>(command: cli.Command<...>): void

  register<T>(key: ValueKey<T>, value: T): void
  register<T>(key: CollectionKey<T>, value: T): void

  get<T>(key: ValueKey<T>): T | undefined
  get<T>(key: CollectionKey<T>): readonly Contribution<T>[]

  has(key: RegistryKey<unknown>): boolean

  readonly host: { readonly name: string; readonly version: string }
}
```

Keys are compared by **string identity, never object identity**. This is not a detail — under pnpm's strict
layout two copies of a contracts package are routine, and `Symbol()` tokens from two copies would silently fail
to match, producing a "capability not found" that no one can debug. String identity makes duplicate-install a
non-event. The convention is `<owning-package>:<name>`, e.g. `cyber-skills:governance`,
`@repobuddy/affected:port`.

The `kind` field is a compile-time discriminant only; `defineKey` and `defineCollectionKey` both return the
string unchanged at runtime, with the registry recording the kind alongside the value.

### 5.2 Both use cases, end to end

**Content federation** — a collection key, contributed by many, consumed by the host:

```ts
// @cyber-skills/contracts
export type GovernanceDoc = { name: string; load: () => Promise<string> }
export const governances = defineCollectionKey<GovernanceDoc>('cyber-skills:governance')

// @repobuddy/agent-changesets/cyber-skills-plugin
export function activate(ctx) {
  ctx.register(governances, {
    name: 'changeset-authoring',
    load: () => readFile(new URL('./governances/changeset-authoring.md', import.meta.url), 'utf8')
  })
}

// host command
run() {
  const all = [...this.core, ...this.registry.get(governances)]
  // each entry carries `source`, so `list --json` can show the providing package (#551 req. 2)
}
```

**Capability federation** — a value key, registered by one plugin, consumed by another:

```ts
// @repobuddy/contracts
export type AffectedSet = { compute(base: string): Promise<string[]> }
export const affectedSet = defineKey<AffectedSet>('@repobuddy/affected:port')

// provider plugin
export function activate(ctx) {
  ctx.register(affectedSet, { compute: (base) => import('./affected.js').then((m) => m.compute(base)) })
}

// consumer plugin — resolves at RUN time, not activation time
export function activate(ctx) {
  ctx.addCommand({
    name: 'verify-split',
    async run() {
      const affected = this.registry.get(affectedSet)
      if (!affected) return this.ui.error('requires a plugin providing @repobuddy/affected:port')
      // ...
    }
  })
}
```

The consumer never imports the provider package. It imports a contracts package containing a type and a string.
The host seeds nothing here, but *can* — a host may `register` its own implementation of a port before plugins
activate, which is exactly the "plugins depend on the host contract, not on siblings" outcome #551's comment asks
for.

### 5.3 Collision rules

**Value keys: first registration wins; later ones are rejected with a warning naming both plugins.**

Not throw, despite Fastify. The person who suffers a throw is the *end user* of the CLI, who wrote neither
colliding plugin and cannot fix either; a dead CLI is a worse outcome than a deterministic winner plus a loud
warning on `--verbose`. Not last-wins either: the config array is the user's stated precedence order, and
first-wins gives them the one rule they can act on — *move it earlier to make it win*. That is ESLint's insight
(the config author is the tiebreaker) reached through a different door.

**Collection keys: no collision. All contributions are kept, in config order, each tagged with its `source`.**

Duplicate *names within* a collection (two plugins both contributing a governance called `changeset-authoring`)
are the host's semantics, not clibuilder's — clibuilder hands over both with provenance and the host decides
whether that is an error, a shadow, or a merge. This is the #191 line held: we provide the mechanism and refuse
to own the meaning.

`ctx.describe()` (or a `--json` flag on the existing `plugins` command) exposes key → source, which satisfies
#551's "list should expose source/package for disambiguation."

### 5.4 Ordering — lazy resolution, no toposort

**Recommendation: keep ordering manual (config order) and make lazy resolution the documented default.**

The ordering problem only exists if a plugin calls `get` while it is *activating*. Move resolution into `run` and
it evaporates: by the time any command executes, `parse()` has awaited all of activation (`builder.ts:57`), so
every plugin has registered regardless of order. A consumer listed before its provider still works.

This requires exposing the registry at run time. Today `run` is called with
`this: { ui, config, keywords, cwd, context }`; add `registry: Registry` (read-only view: `get`, `has`,
`describe`). This is additive to the `this` type of `run` — existing commands are unaffected, and it is the
mechanism that answers #191's surviving objection, since host-authored commands get the same access.

`ctx.get` at activation time stays available for the rare case that genuinely needs it (a plugin that must alter
what commands it registers based on what is present). It is documented as order-dependent: config order applies,
list providers first. That is a documented sharp edge on an advanced path, not a trap on the common one.

**Cost of not adding toposort:** a plugin that must consume at activation time has no way to declare "activate me
after X", and its failure mode is a silent `undefined` rather than a clear error. **What would change this:** if
activation-time consumption turns out to be common rather than rare, add `export const dependencies: string[]`
to the plugin module and toposort `pluginNames` before activation — a strictly additive follow-up that needs no
change to the registry design. Ship without it; the lazy path is what everything should use.

### 5.5 Async activation

**Recommendation: allow `activate` to return `void | Promise<void>`, and await it sequentially.**

```ts
for (const { name, pluginModule } of entries) {
  await pluginModule.activate(ctx)   // `await undefined` for every existing plugin
}
```

**What breaks: nothing at the public boundary.** Per fact (a) in §2, `parse()` already awaits plugin loading, and
module `import()` — already awaited, and far more expensive than any activate body — dominates startup. Sequential
rather than `Promise.all` preserves the config-order determinism the whole design leans on; parallelizing would
buy microseconds and cost the one ordering guarantee we have.

**Cost:** a plugin doing slow I/O in `activate` stalls CLI startup for every user of that CLI, and there is no
timeout or budget. Mitigate by convention, not mechanism: **register a lazy factory, not an awaited value.** A
port whose methods are async, or a `load: () => Promise<T>` thunk, needs no async activate at all — see both
examples in §5.2. Async `activate` exists as an escape hatch for plugins that must do I/O to decide *whether* to
register; it should be rare, and the plugin-author guide should say so.

### 5.6 Capability negotiation

**Recommendation: feature detection as the primary mechanism, plus `ctx.host = { name, version }`. No declared
version ranges, no changes to `isValidPlugin`.**

Feature detection already works and costs nothing:

```ts
export function activate(ctx) {
  if (typeof ctx.register !== 'function') {
    // older host: degrade to commands only
    return ctx.addCommand(fallbackCommand)
  }
  ctx.register(affectedSet, impl)
}
```

`ctx.host` covers what feature detection cannot express — behavioral changes with no new API surface, and useful
diagnostics. It is two strings on an object we are already constructing.

**Why not `fastify-plugin`-style declared ranges** (`export const clibuilder = '>=10'`, validated at boot): it
requires a semver dependency in the library, a policy decision for mismatch (refuse to activate? warn? fail the
CLI?), and it only improves the *error message* for a failure that feature detection already prevents. Babel's
`assertVersion` is the right size for now, and `ctx.host.version` lets a plugin implement it itself.
**What would change this:** plugins in the wild carrying conditional branches for three or more host versions —
at that point a declared range earns its keep as documentation, and can be added additively.

**`isValidPlugin` stays `m && typeof m.activate === 'function'`.** Tightening it would reject every plugin
published to date, for no gain — a plugin that registers nothing is legal.

### 5.7 Backward compatibility

**Recommendation: ship as a minor. No deprecation window, no major.**

`PluginActivationContext` sits in **contravariant** position: the host constructs it and hands it to the plugin.
A plugin declaring `activate(ctx: { addCommand })` — or `activate(cli)` untyped, as every plugin in `test-plugins/`
does — keeps compiling and keeps working when handed a wider object. Nothing is removed and nothing changes shape.

The only code that can break is code that **constructs** a `PluginActivationContext`, i.e. a hand-rolled test
double typed as the full type. Per fact (c) in §2, clibuilder exports no such constructor today —
`mockContext` mocks `Context`, `testCommand` never builds one — so this is limited to test doubles users wrote
themselves, and the fix is one line.

Mitigation, and a #551 requirement (4) in its own right: export `mockPluginContext()` alongside `testCommand()`,
so plugin authors get a supported way to test both contribution and consumption without hand-building a context.
Add a `test-plugins/registry-plugin` fixture exercising register/get across two plugins, matching the existing
`execCommand` fixture pattern in `plugins.spec.ts`.

Changeset: **minor** for `clibuilder`.

## 6. Answers, condensed

| Question | Recommendation | Cost |
| --- | --- | --- |
| `activate` is sync; async ports? | Allow `void \| Promise<void>`, await sequentially | Nothing at the public boundary — `parse()` already awaits loading. A slow `activate` stalls startup with no budget; mitigated by the register-a-factory convention |
| Typing keys across packages | Nominal `RegistryKey<T>` tokens compared by **string** identity, declared in a shared contracts package | One extra tiny package per ecosystem. Nothing enforces the key string is unique across npm — namespacing is a convention, and a stale contracts version means a type mismatch the registry cannot detect |
| Collisions | Value keys: **first wins + warning naming both**. Collection keys: **keep all, config order, tagged with `source`** | A shadowed capability is a warning the end user may never see. Rejected throw-on-duplicate: kills a CLI over a conflict its user did not create |
| Ordering | **Manual (config order)**, with lazy run-time resolution as the default so order stops mattering | Activation-time consumption has no ordering control and fails as a silent `undefined`. Toposort via declared `dependencies` remains an additive follow-up |
| Capability negotiation | Feature detection + `ctx.host = { name, version }`. No declared ranges. `isValidPlugin` unchanged | Plugin authors write their own semver check if they need one. Old hosts hand back a context missing `register`, so the plugin must remember to check |
| Backward compatibility | **Minor.** Additive, contravariant position, no public constructor exists today | Breaks only hand-rolled `PluginActivationContext` test doubles. Ship `mockPluginContext()` to make that unnecessary going forward |

## 7. Option B — plugin manifest exports

The alternative worth taking seriously is #551's own Option B: leave `PluginActivationContext` alone and have
plugins **export named manifests** the host reads off the module after `import()`.

```ts
export function activate(ctx) { ctx.addCommand(...) }
export const contributes = {
  'cyber-skills:governance': [{ name: 'changeset-authoring', load: () => import('./gov.js') }]
}
```

**What it buys:** contributions are static and inspectable *without executing `activate`* — a real property, it
makes a manifest cache or a lockfile-style digest possible later. Typing is trivial (import a type, no token
identity problem, no string-vs-symbol trap). Ordering, async activation, and negotiation questions do not arise
at all: there is nothing to order, nothing to await, nothing to detect. It is a materially smaller change.

**What it cannot do:** consumption. A manifest is one-way. The repobuddy case — split-verification asking the
host for the affected-set port — has no expression in it, and the host cannot seed ports for plugins to use. It
solves #551's body and not #551's comment.

**What would make me pick it:** a Council decision that plugin-to-plugin capability consumption is out of scope
for clibuilder — that plugins may contribute to the host and nothing more, and repobuddy's split should be solved
by a shared npm dependency (ESLint's answer) or by the host explicitly wiring capabilities into command
`context`. If that is the ruling, Option B is strictly better than Recommendation A: it delivers content
federation with less surface, fewer failure modes, and no ordering semantics to document.

I recommend A because the comment's reframing is convincing — the two cases share a root cause, and a channel
that serves only one of them means revisiting this contract again within a release or two. But A is a superset,
not a contradiction: **A can be shipped and a manifest layer added on top later** as sugar that desugars to
`ctx.register` calls. The reverse is not true.

## 8. Non-goals

- Command anchor points / hooks / interception (#191 — stays closed).
- A DI container: no lifetimes, no scopes, no injection, no automatic construction. A map with typed keys and a
  collision policy.
- Plugin discovery. Config-driven `plugins: [...]` only; no `node_modules` scanning, no lockfile walking —
  unchanged from today and explicitly re-affirmed.
- Defining any concrete key. clibuilder ships `defineKey`/`defineCollectionKey` and zero keys.
- Sandboxing or capability *security*. Any activated plugin can read any key. Plugins are already arbitrary code
  the user listed in their config.
- Redesigning `cli.Command`, config loading, or argv parsing.

## 9. Delivery plan, if approved

1. `RegistryKey`/`defineKey`/`defineCollectionKey` + the registry, exported from `ts/index.ts`.
2. Widen `PluginActivationContext`; construct the registry in `activatePlugins` and thread it through
   `activatePlugin` (`plugins.ts`).
3. `for...of` + `await` over entries, replacing the `forEach` (`plugins.ts:28`).
4. Expose the read-only registry on the command `this` in `createCommandInstance` (`builder.ts`).
5. `mockPluginContext()` next to `testCommand()`; `test-plugins/registry-plugin` fixture + `plugins.spec.ts`
   coverage for register/get across two plugins and for both collision paths.
6. Docs: extend `apps/website/src/content/docs/guides/plugins.md` with a "contributing more than commands"
   section, and add the API page.
7. Changeset: minor.

## 10. For the Council

1. **A or B** — is plugin-to-plugin capability consumption in scope for clibuilder, or contribution only? This is
   the only question that changes the shape of the answer; everything else follows.
2. **First-wins + warn, or throw, on value-key collision?** I argue first-wins on end-user-impact grounds; the
   counter-argument (a shadowed capability is a silent correctness bug, and boot-time failure is honest) is
   respectable and this is a judgment call.
3. **Is `mockPluginContext()` in the same release**, or does the testing story follow? It is #551 requirement 4
   and I would not ship the channel without it.
