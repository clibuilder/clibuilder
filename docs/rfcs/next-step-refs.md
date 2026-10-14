# RFC: `ref()` and an opt-in `next[N]{run,why}` key

- **Status:** Implemented in [#714](https://github.com/clibuilder/clibuilder/pull/714). The questions in section 8 are still open.
- **Issue:** [#696](https://github.com/clibuilder/clibuilder/issues/696) (split from [#688](https://github.com/clibuilder/clibuilder/issues/688) item 4)
- **Related:** [axi-native](axi-native.md) section 3.5 (the result channel) and section 10 item 24; [`docs/evals/next-ref/`](../evals/next-ref/README.md); [cyberuni/universal-plugin#177](https://github.com/cyberuni/universal-plugin/issues/177) (the command map)
- **Target:** a minor after 12.0.0. Everything here is additive.
- **Scope:** the `ref()` helper, how a ref is rendered in each channel, the opt-in `next` key, and how the build-time command map reaches core. Not ranked usage errors in `runScript()`, and not positional arguments headless.

## 1. Summary

A command's next-step suggestion today is a literal string: `result(v, { help: 'Run \`cyber-asana task get --gid 123\` for one' })`. That string is wrong once the same function runs as a skill script through `runScript()`, because the target may be a sibling script, the installed CLI, or a pinned `npx` call.

`ref('task get', { gid: task.gid }, 'get one task with its stories')` names the target by its command path and fills its options. The runner turns it into a complete, shell-quoted command line for the channel it runs in.

- **Default wire is unchanged.** A ref is rendered into the existing `help[N]` list as a plain string. An agent, the AXI spec and axi-sdk-js see nothing new.
- **`next[N]{run,why}` is opt-in.** A CLI author who wants the structured form sets `refs: 'next'` on `cli()` or `runScript()`. Only then does the new key appear.
- **The command map is read at run time** from the global that `universal-plugin plugin build` writes into each compiled script. Core does not depend on universal-plugin.

## 2. Why this is open again

The eval in `docs/evals/next-ref/` compared prose, TOON with `help[N]`, and TOON with `next[N]{run,why}` on a small fixture CLI. Every run fixed the task, and `next` did not reduce wrong calls or turns against `help`. That result holds for the case it tested: a CLI whose `--help` is short and lists every command, which every run read first.

It does not cover:

- a CLI whose help is large, so an agent skips it or reads only part of it;
- a skill script, which has no `--help` for the other commands at all, so the only pointer to the next step is the one in the output;
- an author who wants a structured pointer for their own reasons, such as a client that runs the suggested command for the agent.

So the feature stays, as an option an author takes. The eval result stays as evidence that the default (`help` strings) is enough for the simple case, which is why the default does not change.

## 3. `ref()`

```ts
import { ref, placeholder, result } from 'clibuilder/axi'

run({ gid }) {
	const task = await getTask(gid)
	return result(task, {
		help: [
			ref('task get', { gid: task.parent.gid }, 'show the parent task'),
			ref('task update', { gid: task.gid, name: placeholder('name') }, 'rename it'),
			'Pass --full to see every story'
		]
	})
}
```

- **Signature.** `ref(path: string, options?: Record<string, unknown>, why?: string): Ref`. `path` is the command path as a user types it (`'task get'`), without the CLI name. `options` are keyed by option name. `why` is a verb phrase.
- **Where it goes.** A ref is one more element type in the `help` lists that exist today: `result(…, { help })`, `empty(…, { help })` and `new CliError(…, { help })`. `help` widens from `string | readonly string[]` to `HelpLine | readonly HelpLine[]`, where `HelpLine = string | Ref`. A plain string is never parsed or rewritten.
- **Shape.** A ref is plain data tagged with `Symbol.for('clibuilder.ref')`, like an `Answer`, so a ref made by one copy of clibuilder is read by another. It lives in `render/` and imports nothing from the framework (axi-native section 4.1, tier B), so `runScript()` bundles it at a few hundred bytes.
- **Placeholders.** AXI principle 9 asks for placeholders such as `<id>` when the next value is not known yet. `placeholder('name')` renders as `<name>`, unquoted. A plain string value `'<name>'` is a real value and is shell-quoted. The marker is explicit so a value that happens to start with `<` is never left unquoted.
- **Option rendering.** Each option renders as `--name value`, in the order given. `true` renders as `--name`, and `false` and `undefined` are left out. An array repeats the flag. Values are quoted with POSIX single quotes when they contain anything outside `[A-Za-z0-9_./:@%+=,-]`. Aliases are never used.
- **No positional arguments yet.** A ref passes options only. `runScript()` does not take positionals, and a ref that fills a positional of a `cli()` command would need the target's argument order, which a script cannot see. An option name that is really an argument name fails the `cli()` check below.

## 4. Rendering a ref

A ref is resolved to one runnable line, `run`, by a resolver the runner supplies. The resolver is the only part that knows the channel.

| Running as | `run` |
| --- | --- |
| `cli()` | `<name> task get --gid 123`, where `<name>` is `cli({ name })` |
| `runScript()`, target bundled in the same plugin | `node <absolute real path>/scripts/task-get.mjs --gid 123` |
| `runScript()`, target not bundled, `bin` known, installed in the project | `pnpm exec <bin> task get --gid 123` |
| `runScript()`, otherwise, `package` and `version` known | `npx <package>@<version> task get --gid 123` |
| `runScript()`, no command map, or none of the above apply | no `run` (see below) |

**The `help` form (default).** Each ref becomes one `help` string: `` Run `<run>` to <why> ``, or `` Run `<run>` `` without a `why`. This matches the spec's own examples of help hints, so the wire is the one the AXI spec and axi-sdk-js already have.

**The `next` form (opt-in).** With `refs: 'next'`, refs in a `result` or an `empty` answer are taken out of `help` and encoded as `next[N]{run,why}`, after `help`. Plain strings stay in `help`. When every line is a ref, `help` is left out, as it is today when it is empty. In `json` the key is an array of `{ run, why }` objects, and in `text` it is rendered like any other list of objects.

**Errors keep `help`.** A ref in a `CliError` always renders in the `help` form, whatever `refs` says. The error shape is the one core's conformance test compares with axi-sdk-js's `errorOutput()` (axi-native section 9), and that test stays as it is.

**When there is no runnable line.** The issue's rule is that an agent never gets a bare command path. A ref the resolver cannot render is dropped and is never written as a path. In `cli()` this cannot happen, because the target is in the command tree (section 5). In `runScript()` it happens only for a script compiled without the map, or for a plugin that ships to no package and does not bundle the target.

**Validation.** In `cli()` the resolver walks the command tree by name or alias. A path that names no command, or an option that neither the target nor the global options declare, throws a programmer error rather than printing a wrong line, so a command's own tests catch it. Values are rendered as given; a descriptor converts a string into a value, not back, so there is nothing to render them through. `runScript()` has only the map of bundled scripts, and a target that is not bundled is still valid (it renders through `pnpm exec` or `npx`), so it does not check. Because one command function serves both entries, the `cli()` test of that function is what checks its refs.

## 5. How the command map reaches core

[universal-plugin#177](https://github.com/cyberuni/universal-plugin/issues/177) shipped the map. `plugin build` compiles each declared skill script and writes one line into its header:

```js
globalThis.__SKILL_SCRIPT__ = {"package":"cyber-asana","bin":"cyber-asana","version":"1.4.0","entry":"skills/asana/scripts/task-get.mjs","commands":{"task get":"skills/asana/scripts/task-get.mjs","task list":"skills/asana/scripts/task-list.mjs"}};
```

`version` comes from `plugin.json` (universal-plugin#179), `entry` is this script's own path and `commands` maps a command path to its script, both relative to the plugin root.

- **The global is the contract.** `runScript()` reads `globalThis.__SKILL_SCRIPT__` once, on the first ref it renders. It checks the shape and ignores a value that does not match, so a script compiled by an older or newer build degrades to the `help` strings it can still make. clibuilder declares its own type for the data and does not import universal-plugin; a contract test pins the field names against a fixture copied from universal-plugin's `composeScript()`.
- **The plugin root comes from the running script.** `realpath(process.argv[1])` minus `entry` is the plugin root, and the target is the root joined with `commands[path]`. Using the real path makes the line work through a pnpm link, a copy, or a plugin cache. `import.meta.url` is not used, because clibuilder's module is not the script's module until it is inlined.
- **"Installed in the project"** means `node_modules/.bin/<bin>` exists in the working directory or one of its parents. pnpm only links skills of direct dependencies, so in that channel the check usually passes.
- **An explicit option for tests and other builds.** `runScript({ commands })` takes the same `ScriptData` object directly. When it is given, the global is not read. This is also how a build tool other than universal-plugin supplies the map.
- **`cli()` does not read the global.** The full CLI has its command tree, so its resolver needs nothing from the build.

## 6. Checked against the AXI spec and axi-sdk-js

- **Principle 9 (contextual disclosure).** The spec asks that every suggestion be a complete command, carry forward disambiguating flags, use placeholders for unknown values, and be left out when the output is self-contained. A ref is a complete command by construction, `placeholder()` gives the placeholder form, and the author still decides when to suggest anything. The spec names `help[]` as the place for suggestions, and that is where refs go by default.
- **axi-sdk-js.** Its `errorOutput(message, code, suggestions)` writes suggestions as `help`, a list of strings, and it has no answer helper with a suggestions argument. clibuilder's errors keep exactly that shape, and its answers keep `help` as a list of strings unless the author opts in. Nothing in the SDK reads or rejects an extra key, so an opted-in `next` key breaks no SDK consumer; it is simply a key the SDK does not produce.
- **The `next` key is a clibuilder extension.** An agent that does not know it still reads it as data, since TOON headers are self-describing (`next[2]{run,why}:`). It is documented as an extension, not as part of AXI, and it is not proposed upstream until a CLI that opted in has data showing it helps.

## 7. Changes

| Part | Change | Package |
| --- | --- | --- |
| `ref()`, `placeholder()`, `Ref`, `HelpLine` | new, in `render/`, exported from `clibuilder` and `clibuilder/axi` | `clibuilder` |
| `result`, `empty` | `help` accepts `HelpLine` | `clibuilder` |
| `CliError` | the `help` option accepts `HelpLine`. The `help` field stays `string[]`, with a ref read as ``Run `<path> …` `` without a cli name, so code that reads it is unchanged. The lines as given sit under `Symbol.for('clibuilder.CliError.helpLines')` for the runners | `clibuilder` |
| `printAnswer(returned, format)` | gains an optional third argument, `{ resolve, refs }`; without it a ref renders as `` Run `<path> …` `` with no CLI name, for callers outside both runners | `clibuilder` |
| `cli({ refs })` | `'help'` (default) or `'next'`; the resolver walks the command tree | `clibuilder` |
| `runScript({ refs, commands })` | same `refs`; `commands` overrides the global | `clibuilder` |
| contract test | `__SKILL_SCRIPT__` field names against a universal-plugin fixture | `clibuilder` |
| boundary | `render/ref.ts` joins the tier B contract files; `script/` may import `node:fs` and `node:path` to find the target script | `biome.json`, `axi.spec.ts` |
| runner bundle cap | 22 KB to 24 KB: the resolver and the ref rendering add about 2 KB to `runScript()` | `script/bundle_size.spec.ts` |

All of it is additive, so it ships in a minor. A command that never calls `ref()` prints exactly what it prints today.

## 8. Open questions

1. **Per-answer opt-in.** `refs` is set per CLI. Should `result(v, { refs: 'next' })` also exist, so one command can opt in without the rest? Proposed, awaiting Council: no, until an author asks; mixed shapes in one CLI are harder for an agent to learn.
2. **Carrying flags forward.** Principle 9 asks to carry forward disambiguating flags such as `--repo`. Should a ref copy the current invocation's global options automatically? Proposed, awaiting Council: no; the author passes them, because the runner cannot tell which ones disambiguate.
3. **A second eval.** The design does not wait for it, since the feature is opt-in. When a CLI with a large `--help`, or a set of skill scripts, opts in, rerun `docs/evals/next-ref/` against it to decide whether `next` should ever become a default. Rerun on a fixture with a 255-line or absent `--help` ([Q3 results](../evals/next-ref/README.md#q3-a-cli-with-a-large-or-absent---help)): `next` removed the failed rollback calls when help was absent and made no difference when help was large but complete. It does not settle the default, because a `help` string carrying the full command was not tested.
