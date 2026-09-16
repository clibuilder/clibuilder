---
spec-type: behavioral
concept: [declaration-driven]
---

# Command definition

Governs `ts/command.ts` and `ts/command.internal.types.ts` — the shape a command
author declares: name, alias, description, arguments, options, nested
sub-commands, and the types those declarations produce.

## What

A `clibuilder` application is assembled from **declarations**. A command author
writes down what a command is called, what it accepts, and what it does; the
framework reads that one declaration for everything else it needs — matching an
argv vector to a command, coercing and validating the inputs, and rendering
help. Nothing about a command is stated twice.

This capability owns the **declaration itself**: its permitted shape, and the
`run`-argument types it produces. Because the framework reads the declaration
rather than a separate schema, the declaration is also where the author gets
their return on stating a type — declaring an argument as a number is what makes
`args.arg1` a `number` inside `run`.

Almost every decision here resolves in the **type system**. `command()` is an
identity function at runtime: its whole value is that it constrains the literal
it is handed and infers the `run` signature from it. The acceptance point for
this node is therefore the compiler, observed through `type-plus`'s `testType`
assertions.

**Non-goals.** Matching argv against the declared tree, coercing raw strings, and
reporting a validation failure belong to `input-parsing/`. Assembling an
application from declarations and running the matched command belong to
`execution/`. Rendering the declaration as help belongs to `presentation/`.
Accepting a declaration contributed by a third party belongs to `plugins/`. This
node stops at what may be declared and what that declaration types.

**Key terms.** A **leaf** command declares `run` and does the work. A **group**
command declares `commands` and only nests. A **default command** is the one the
application runs when argv names no sub-command; it omits `name`, which the
application supplies. An **implicit option** is one the framework adds to every
command without the author declaring it — there is exactly one, `help`.

## Use Cases

**Actors.**

| Actor | Reaches this capability | Goal |
| --- | --- | --- |
| CLI author | writes a declaration, directly or through `command()` | state a command once and have its `run` arguments typed from that statement |
| Plugin author | hands a declaration to `addCommand` | contribute a command to a host application without compiling against it |
| Sibling capabilities (`input-parsing`, `presentation`, `execution`) | read the declaration | have one source to route, validate, and render from |
| CLI end user *(stakeholder — never invokes this node)* | — | the help text and the input errors they see are exactly what the author declared |

The end user is the stakeholder where a missed use case hides: they are affected
by every declaration decision and can invoke none of them, so a shape the author
can express but the framework cannot render is this node's defect, not
`presentation/`'s.

### UC1 — `command()`: declare a command and infer its run arguments

**Actor / goal.** A CLI author wants a command's `run` arguments typed from the
same declaration the framework routes and validates by, without repeating the
types.

| | |
| --- | --- |
| Trigger | the author calls `command(cmd)` |
| Inputs | a declaration literal: `name`, optional `description` / `alias` / `config` / `arguments` / `options`, and either `run`, `commands`, or both |
| Outcome | the literal is returned unchanged, narrowed to its own shape, with `run`'s `args` parameter typed from the declared `arguments` and `options` |

**Extensions.**

| Cause | Outcome |
| --- | --- |
| the declaration has neither `run` nor `commands` | rejected — it satisfies neither arm of the `Command` union |
| an argument omits `type` | accepted; that argument types as `string` — the raw argv form, unconverted |
| an option omits `type` | accepted; that option types as `boolean \| undefined` — a flag that may be absent |
| an option's `type` is optional | accepted; the inferred type carries `\| undefined` |
| an option's `default` disagrees with its `type` | **accepted, unchecked** — see the gap below; the option still types as its declared type, so `run` receives a value the declaration says is impossible |
| the author declares an option named `help` | accepted; the declared type replaces the implicit one rather than colliding with it |

At runtime this use case has **no** extensions — `command()` returns its
argument and cannot fail. Every row above is a compile-time path.

**Known gap — `default` is not checked against `type`.** `Options` is declared as
`Record<Name, Options.Entry<Type>>` with `Type` defaulting to `z.ZodType<any>`
and never inferred per entry, so `Entry`'s `default?: z.infer<Type>` widens to
`any`. An option declaring `type: z.array(z.string())` and `default: 5` compiles,
and `args.abc` still types as `string[]`. The specified behavior below is the
current one; closing the hole needs per-entry inference of `Type` and is tracked
as a followup in this spec's ledger.

### UC2 — `Command.parent`: carry a command's place in the tree

**Actor / goal.** A sibling capability walking the command tree wants to reach a
matched command's ancestors — to build its full invocation path for help, or to
resolve a name relative to its parent.

| | |
| --- | --- |
| Trigger | the framework augments a declaration as it registers it into the tree |
| Inputs | a declared `cli.Command` |
| Outcome | the internal `Command` type — the declaration plus an optional `parent` link |

**Extensions.** `parent` is absent on a root command; that is the base case, not
a failure. Nothing else can happen: the type is a structural widening with no
decision of its own beyond present-or-absent.

**Surface trace.** Every element the capability exposes, against the use case
requiring it:

| Element | Required by | May not combine with |
| --- | --- | --- |
| `name` | UC1 | — (absent on a default command, which the application names) |
| `description`, `alias` | UC1 | — |
| `config` | UC1 — types `this.config` in `run` | — |
| `arguments`, `options` | UC1 — types `args` in `run` | — |
| `run` | UC1 | — (may coexist with `commands`) |
| `commands` | UC1 | — |
| `context` | UC1 — types `this.context` in `run` | the `commands`-only arm, which has no `run` to type |
| `parent` | UC2 | — (internal; never author-declared) |

## Control Flow

`command()` performs no runtime work, so the graph below is the **type
resolution** the compiler runs over the declaration literal. It has two
independent sub-graphs — arm selection, and per-entry input typing — which do
not interact: a group command simply never reaches the second.

### Arm selection

```mermaid
graph TD
  D[declaration literal] --> R{declares run?}
  R -- yes --> RC[leaf arm: run's `this` typed with ui, config, keywords, cwd, context, registry]
  R -- no --> C{declares commands?}
  C -- yes --> GC[group arm accepted; no run to type]
  C -- no --> X[rejected: satisfies neither arm]
  RC --> ARGS[type the run arguments]
```

### Run-argument typing

Entered only from the leaf arm. Each declared entry resolves independently, and
the results merge into one `args` object.

```mermaid
graph TD
  ARGS[type the run arguments] --> A{per declared argument}
  A -- has type --> A1["z.infer&lt;Type&gt;"]
  A -- omits type --> A2[string]
  ARGS --> O{per declared option}
  O -- has type --> O1{"type is optional?"}
  O1 -- yes --> O1a["z.infer&lt;Type&gt; | undefined"]
  O1 -- no --> O1b["z.infer&lt;Type&gt;"]
  O -- omits type --> O2["boolean | undefined"]
  O1b --> DF{declares default?}
  DF -- yes --> DF1["default accepted unchecked; option keeps its declared type"]
  ARGS --> H{options declare help?}
  H -- no --> H1["implicit help: boolean | undefined added"]
  H -- yes --> H2[declared help replaces the implicit one]
```

## Scenario map

### UC1 — `command()`

| Edge | Path (Given) | Scenario |
| --- | --- | --- |
| declares `run` | any | `a declaration with run is accepted as a leaf command` |
| declares `commands`, no `run` | any | `a declaration with only commands is accepted as a group` |
| declares neither | any | `a declaration with neither run nor commands is rejected` |
| argument has `type` | any | `a typed argument types as its declared type` |
| argument omits `type` | any | `an untyped argument types as string` |
| option has `type` | non-optional type | `a typed option types as its declared type` |
| option has `type` | optional type | `an optionally-typed option types as its type or undefined` |
| option omits `type` | any | `an untyped option types as an optional boolean` |
| `default` accepted unchecked | any — matching or contradicting | `an option default is accepted without being checked against its type` |
| implicit `help` added | options omit `help` | `help is present on a command that declares no options` |
| declared `help` replaces implicit | options declare `help` | `a declared help option replaces the implicit one` |

### UC2 — `Command.parent`

| Edge | Path (Given) | Scenario |
| --- | --- | --- |
| `parent` present | a nested command | `a nested command carries its parent` |
| `parent` absent | a root command | `a root command carries no parent` |
