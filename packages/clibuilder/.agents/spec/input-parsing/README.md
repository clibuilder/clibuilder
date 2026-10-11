---
spec-type: behavioral
concept: [declaration-driven, error-reporting]
---

# Input parsing

Governs `src/invocation/` — classifying an argv vector, matching it against the
declared command tree, and handing each raw string to `args-minus` to be
converted and validated into the declared argument and option types.

## What

An operating system hands a CLI an array of strings. This capability turns that
array into the three things the rest of the framework needs: **which** command
was invoked, **what** its inputs are as declared types rather than strings, and
**what was wrong** with the invocation. It is the only place raw argv is
interpreted.

The work happens in three stages, and the split matters because each has a
different notion of correctness. **Tokenizing** is pure shape — it knows nothing
about which command is running, so it cannot tell a typo from a valid option and
never reports an error. **Matching** walks the declared tree to find the command
the user meant. **Filling** is the only stage that consults the declaration, so
it is the only stage that can judge an input wrong.

Errors are **collected, not thrown**. A single invocation can be wrong in
several ways at once, and reporting them together is what lets a user fix an
invocation in one pass instead of one round-trip per mistake.

**Non-goals.** What may be declared belongs to `command-definition/`. Deciding
what to do with the collected errors — printing them, choosing an exit code —
belongs to `execution/` and `presentation/`. Configuration files are read by
`configuration/`, not from argv.

**Key terms.** A **token** is one element of argv after the node binary and
script path are dropped. **Option state** is the tokenizer awaiting values for
an option it has just opened. The **terminator** is `--`, after which tokens are
meant to be passed through raw. A **variadic** argument is one declared with an
array type; it consumes every remaining positional.

## Use Cases

**Actors.**

| Actor | Reaches this capability | Goal |
| --- | --- | --- |
| CLI end user | types an invocation | reach the command they meant with the values they meant, or be told precisely what was wrong |
| `execution` | calls `lookupCommand(command, args)` | get a matched command, typed args, and an error list to act on |
| `execution`, again | calls `lookupOptions(baseCommand, key)` | keep a valid global flag from being reported as a usage error when the sub-command it was typed against declares no options of its own |
| `presentation` | reads the returned errors | render each failure in the user's terms |
| CLI author *(stakeholder — never invokes this node)* | — | the types they declared are the types `run` receives |

### UC1 — `parseArgv`: classify an argv vector into positionals and option values

**Actor / goal.** `execution` wants argv reduced to shape — positionals, option
keys with their values, and any terminator remainder — before any declaration is
consulted.

| | |
| --- | --- |
| Trigger | `parseArgv(argv)` |
| Inputs | the raw argv array; the first two elements (node binary, script) are dropped |
| Outcome | `{ _: positionals, __?: raw remainder, ...key: values }` |

**Extensions.**

| Cause | Outcome |
| --- | --- |
| an option is opened and never given a value | its value is the string `'true'` |
| the same option key appears more than once | the values accumulate under that key |
| a single-dash token clusters several characters (`-abc`) | all but the last are `'true'`; the last opens for values |
| a token begins with `-` but contains no word character (`-`) | it is a positional, not an option |
| a token is `-5` | **it opens an option named `5`** — a negative number cannot be given as a value; see the gaps below |
| `--` arrives while an option is awaiting values | **it is consumed as that option's value** and no terminator is opened; see the gaps below |

This stage reports **no errors** — it cannot, having never seen a declaration.

### UC2 — `lookupCommand`: match a command and fill its declared inputs

**Actor / goal.** `execution` wants the deepest command the invocation names,
with every declared argument and option converted to its declared `t` descriptor and every
failure collected.

| | |
| --- | --- |
| Trigger | `lookupCommand(command, args, fallback?)` |
| Inputs | the root command declaration, the tokenized args, and optionally a fallback command whose options apply to every command (`execution` passes the base command, so these are the global options) |
| Outcome | `{ command, args, errors }` — errors empty on a clean invocation |

**Extensions.**

| Cause | Outcome |
| --- | --- |
| no sub-command matches the first positional | the current command is the match; positionals stay for its arguments |
| a fallback option comes before or inside the command path (`app --format json group sub`) | it takes as many following tokens as its declaration says (the matched command's own declaration of that key, else the fallback's), and the next token can still name a sub-command |
| an option the fallback does not declare comes before the command path | the command path ends there: a command's own option is only valid after the command, so it is matched against the command reached so far |
| a sub-command's name comes after the terminator | it is not matched: the path never reads the terminator's remainder |
| a required argument has no positional left | `missing-argument` |
| positionals remain after every declared argument is filled | `extra-arguments` |
| an option key matches no declared name or alias | `invalid-key` |
| a key retains a leading dash (from `---abc`) | `invalid-key` |
| the terminator was used | **`invalid-key` for `__`, and the remainder is dropped**; see the gaps below |
| a value cannot be converted to its declared type, or fails its range, pattern or check | `invalid-value`, in the wording of `args-minus`, carrying `keyKind`, `constraint` and what the option would have accepted; the option gets no value and its default does not fill the slot |
| an option is neither `.optional()` nor given a `default` and is absent | `missing-argument` naming the option |
| a boolean option (or an option with no `type`) is followed by a token | the token is not its value and stays a positional; `--flag=false` gives it `false` |
| an array option is given | each occurrence supplies one value (`--tag a --tag b`); in `--tag a b`, `b` stays a positional |
| several values are given for a scalar option | `expect-single` with `keyKind`, and the option gets no value |

### UC3 — `lookupOptions`: decide whether a key names a declared option

**Actor / goal.** `execution` holds a key that the matched command reported as
unknown, and wants to know whether it is in fact one of the application's global
options — declared on the base command rather than on the sub-command the user
typed it against. A global flag is always accepted, so answering yes is what
keeps `--verbose` on a sub-command from being reported as a usage error. The
declared name comes back with the entry, so a key typed as an alias lands under
the name its author declared.

| | |
| --- | --- |
| Trigger | `lookupOptions(command, key)` |
| Inputs | a command declaration and a key as the user typed it |
| Outcome | `[name, entry]` — the declared name and the option it names |

**Extensions.**

| Cause | Outcome |
| --- | --- |
| the command declares no options at all | an empty tuple; the key names nothing here |
| the command declares options, none matching by name or alias | an empty tuple; the key names nothing here |

The same decision is how UC2 fills an option from argv, so it is drawn once — as
sub-graph E — and both enter it. What a caller does with an empty tuple is the
caller's: UC2 raises `invalid-key`, and `execution` keeps the error it already
had.

**Known gaps.** Three tokenizer/filler decisions below are current behavior that
the suite fixes as-is; each is filed as a defect in this spec's ledger.

1. **The terminator is unreachable.** `fillInputOptions` skips the `_` key but
   not `__`, so any invocation using `--` reports `invalid-key: __` and the raw
   remainder never reaches `run` — even though `lookupCommand.Result` declares
   an `__?: string[]` field for it.
2. **`--` after an open option is swallowed.** `isOption('--')` is false (no word
   character), so the tokenizer's option-state branch claims it before the
   terminator branch is reached: `--opt -- abc` yields `opt: ['--', 'abc']`.
3. **A negative number is read as an option.** `isOption('-5')` is true, so `-5`
   opens an option named `5`. A command declaring a number argument cannot be
   given a negative value.

**Surface trace.**

| Element | Required by | May not combine with |
| --- | --- | --- |
| `parseArgv` | UC1 | — |
| `parseArgv.Result._` / `.__` | UC1 | — (`__` is presently unreadable downstream — gap 1) |
| `lookupCommand` | UC2 | — |
| `lookupCommand.Result.errors` and its five error types | UC2 | — |
| `lookupOptions` | UC3, and internally by UC2's filling step | — |

## Control Flow

### Sub-graph A — tokenize (`parseArgv`), entered by UC1

```mermaid
graph TD
  T[next token] --> TERM{terminator already open?}
  TERM -- yes --> TR[append raw to __]
  TERM -- no --> OPT{"starts with - and has a word char?"}
  OPT -- yes --> CLOSE["close any open option — sub-graph A2"] --> DASH{single dash?}
  DASH -- yes --> SD{"contains = ?"}
  SD -- yes --> SCV["cluster: every character but the last becomes 'true'; the last opens with the text after ="]
  SD -- no --> SC["cluster: every character but the last becomes 'true'; the last opens with no values"]
  DASH -- no --> MC{"contains = ?"}
  MC -- yes --> MCV[key and value split at =]
  MC -- no --> MCO[key opens with no values]
  OPT -- no --> ST{option awaiting values?}
  ST -- yes --> V[append token as that option's value]
  ST -- no --> D{token is --?}
  D -- yes --> OPENT[open the terminator]
  D -- no --> POS[append to positionals]
  V --> ENDD["a -- here is taken as a value (gap 2)"]
  END[end of tokens] --> C2{option still open?}
  C2 -- yes --> EO["close it — sub-graph A2"]
```

Each character a cluster sets to `'true'` is closed through A2 in turn, so a
repeated character accumulates like any other repeated key.

### Sub-graph A2 — close an option, entered from A

```mermaid
graph TD
  CO[the open key and the values collected for it] --> HV{any values collected?}
  HV -- no --> TRUE["its value is the string 'true'"]
  HV -- yes --> VALS[its collected values]
  TRUE --> SEEN{"this key already has values?"}
  VALS --> SEEN
  SEEN -- yes --> ACC[append to them: a repeated key accumulates]
  SEEN -- no --> NEW[start the key's list]
```

### Sub-graph B — match (`matchCommand`), entered by UC2

```mermaid
graph TD
  M[command with sub-commands] --> IT[scan sub-commands last to first]
  IT --> NN{sub-command has no name?}
  NN -- yes --> DEF["match it; consume nothing (position decides: declared last it shadows, declared first it is the fallback)"]
  NN -- no --> NM{"next path token equals its name or alias? — sub-graph B2"}
  NM -- no --> IT
  NM -- yes --> SH[consume that token] --> NEST{has sub-commands?}
  NEST -- yes --> REC[recurse; deepest match wins]
  NEST -- no --> HIT[matched]
  IT --> EXH[none matched: the current command is the match]
```

### Sub-graph B2 — the next path token, entered from B

The path tokens are read in command line order: the positionals before the first
option, then the tokens each fallback option does not take as its value.

```mermaid
graph TD
  P[next path token] --> POS{"a positional before the first option is left?"}
  POS -- yes --> TOK[that positional]
  POS -- no --> OCC{"an option occurrence is left?"}
  OCC -- no --> NONE[none: the path ends]
  OCC -- yes --> FB{"the fallback declares its key?"}
  FB -- no --> NONE
  FB -- yes --> AR["skip the tokens it takes: the arity of the current command's own declaration of the key, else the fallback's"]
  AR --> LEFT{"a following token is left?"}
  LEFT -- yes --> TOK2[that token]
  LEFT -- no --> OCC
```

Without a fallback no option is walked, so only the positionals before the
first option can name the path.

### Sub-graph C — fill (`processCommand`), entered by UC2

Runs in a fixed order: arguments, then the options present in argv, then every
declared option. Every declaration is a `t` descriptor; one with no `type` is
read as `t.string()` for an argument and `t.boolean().optional()` for an option.
Before this graph runs, the tokens that follow each option are shared out by its
declared type: a boolean takes none, a scalar takes one, an array takes one per
occurrence, and every other token goes back to the positionals.

```mermaid
graph TD
  FA[per declared argument] --> AT{declares a type?}
  AT -- yes --> AV{positional available?}
  AT -- no --> ASTR[treat it as t.string] --> AV
  AV -- no --> OPTQ{type optional?}
  OPTQ -- yes --> SKIP[skip, no error]
  OPTQ -- no --> MISS[missing-argument]
  AV -- yes --> ARR{array type?}
  ARR -- yes --> VAR[consume every remaining positional]
  ARR -- no --> ONE[consume one]
  VAR --> QA[queue for conversion] --> LEFT{positionals left over?}
  ONE --> QA
  LEFT -- yes --> EXTRA[extra-arguments]
  FO[per key in tokenized args] --> UK{key is _ ?}
  UK -- yes --> SKIP2[skip: the positionals were already taken as arguments]
  UK -- no --> LD{"key starts with - ?"}
  LD -- yes --> IK[invalid-key]
  LD -- no --> LU{"resolves by name or alias? — sub-graph E"}
  LU -- no --> IK
  LU -- yes --> OT{"the resolved option declares a type?"}
  OT -- yes --> SG{"not an array, and given more than once?"}
  OT -- no --> OBOOL[treat it as t.boolean optional] --> SG
  SG -- yes --> ES["expect-single with keyKind; the option is left out of conversion"]
  SG -- no --> KEEP[keep its argv tokens for conversion]
  IK --> GAP1["__ lands here (gap 1)"]
  FD[per declared option, given or not] --> SKIPES{"reported expect-single?"}
  SKIPES -- yes --> NOOP[leave it unset]
  SKIPES -- no --> QO["queue it with its argv tokens for conversion"]
```

### Sub-graph D — convert (`convertDescriptors`), entered from C

`args-minus` does the conversion; this node only hands it each queued
declaration, one at a time and in order, and turns its failure into a usage
error. An option is parsed from its own argv tokens. An argument has no option
token, so each of its values is given inline. The declarations of the matched
command run after `--help` and `--version` have been read from its own flags
(`peekFlags`), and may await an async converter or check. The global options of
the base command are converted synchronously (`convertDescriptorsSync`).

```mermaid
graph TD
  CV[declaration and its raw input] --> G{value given?}
  G -- no --> DF{declares a default?}
  DF -- yes --> DCK[the default's checks run; it is used as declared]
  DF -- no --> OP{optional?}
  OP -- yes --> UNSET[left unset]
  OP -- no --> MISS[missing-argument naming the option]
  G -- yes --> K{which kind?}
  K -- boolean --> B{"no value, or an inline true or false?"}
  B -- yes --> BOK[boolean]
  B -- no --> BERR["invalid-value: expected no value, true or false"]
  K -- number --> N{numeric?}
  N -- yes --> NOK[number]
  N -- no --> NERR["invalid-value: expected a number"]
  K -- string --> SOK[the value as typed]
  K -- enum --> E{listed?}
  E -- yes --> EOK[the value]
  E -- no --> EERR["invalid-value: expected one of the listed values"]
  K -- array --> EL[convert each occurrence by the element type; a failure carries its index]
  K -- custom --> CU["the converter; a plain Error is invalid-value, anything else rejects"]
  BOK --> CK
  NOK --> CK
  SOK --> CK
  EOK --> CK
  EL --> CK
  CU --> CK
  CK{"range, pattern and checks accept?"} -- yes --> OK[set under the declared name]
  CK -- no --> CERR["invalid-value; a foreign schema's text is never forwarded: failed a check"]
```

Every `invalid-value` carries the key as typed, the value as typed, the message,
the descriptor's `keyKind` and its `constraint`, and for an enum the `allowed`
values. A value that fails is not set, and the default does not take its place.

### Sub-graph E — resolve a key (`lookupOptions`), entered by UC3 and from C

```mermaid
graph TD
  L[a command declaration and a key] --> ANY{declares any options?}
  ANY -- no --> NONE[empty tuple: the key names nothing here]
  ANY -- yes --> NAME{"an option is declared under exactly that key?"}
  NAME -- yes --> ASNAME[that key and its entry]
  NAME -- no --> AL{"an option lists it among its aliases?"}
  AL -- yes --> ASALIAS[the declared name and its entry]
  AL -- no --> NONE
```

An alias may be written as a bare string or as `{ alias, hidden }`; both forms
are matched, and `hidden` affects only how `presentation/` lists it.

## Scenario map

### UC1 — `parseArgv`

| Edge | Path (Given) | Scenario |
| --- | --- | --- |
| key and value split at `=` | long option | `a long option written with = takes the text after it as its value` |
| key opens with no values | long option, next token is a positional | `a long option takes the following token as its value` |
| no values collected: `'true'` (A2) | option is last, or followed by another option | `an option given no value becomes true` |
| append to them: a repeated key accumulates (A2) | the same key opened twice | `an option repeated accumulates its values` |
| cluster: every character but the last becomes `'true'` | single dash, several characters | `a single-dash cluster sets every character but the last to true` |
| cluster with `=`: the last character opens with the text after it | single dash, several characters, `=` | `a single-dash cluster with = gives its value to the last character` |
| append to positionals | no option awaiting values | `a bare token is a positional` |
| starts with `-`, no word char | token is a lone dash | `a lone dash is a positional, not an option` |
| starts with `-`, has a word char | token is a negative number | `a negative number opens an option named by its digits` |
| open the terminator | no option awaiting values | `a terminator collects every following token raw` |
| append token as that option's value | an option is awaiting values | `a terminator arriving while an option is open becomes that option's value` |
| append raw to `__` | terminator already open | `a token shaped like an option after the terminator is kept raw` |

### UC2 — `lookupCommand`, matching

| Edge | Path (Given) | Scenario |
| --- | --- | --- |
| first positional equals its name | a declared sub-command | `an invocation naming a sub-command matches it and consumes its name` |
| first positional equals an alias | a declared sub-command with an alias | `an invocation naming a sub-command's alias matches it` |
| none matched | sub-commands declared, none named | `an invocation naming no sub-command matches the command itself` |
| sub-command has no name | declared before its named siblings, none of which match | `a nameless sub-command matches without consuming a positional` |
| sub-command has no name | declared after its named siblings | `a nameless sub-command declared last shadows its named siblings` |
| recurse, deepest match wins | a matched sub-command that itself nests | `an invocation naming a nested path matches the deepest command` |
| scan last to first | two sub-commands declared under one name | `the later of two sub-commands sharing a name wins` |
| skip the tokens it takes; that token (B2) | a fallback flag before a sub-command's name | `a global option before a sub-command name does not take the name as its value` |
| skip the tokens it takes (B2) | a fallback option taking a value before a sub-command's name | `a global option's value before a sub-command name is not taken as the name` |
| skip the tokens it takes; recurse (B, B2) | a fallback option between a group and its sub-command | `a global option between a group and its sub-command` |
| the fallback declares its key? — no (B2) | a sub-command's own option before its name | `a command's own option before the command name ends the command path` |
| none: the path ends (B2) | the sub-command's name after the terminator | `a command name after the terminator is not matched` |

### UC2 — `lookupCommand`, filling

| Edge | Path (Given) | Scenario |
| --- | --- | --- |
| consume one | a non-array argument with a positional available | `a declared argument takes the next positional` |
| consume every remaining positional | an array-typed argument | `an array argument consumes every remaining positional` |
| `missing-argument` | a required argument with no positional left | `a required argument with nothing left reports it missing` |
| skip, no error | an optional argument with no positional left | `an optional argument with nothing left is skipped without error` |
| `extra-arguments` | every declared argument filled, positionals remain | `positionals left over after every argument are reported as extra` |
| treat it as t.string | an argument declaring no type | `an argument declaring no type is filled as a string` |
| skip: the positionals were already taken as arguments | positionals were given | `the positionals key is not reported as an unknown option` |
| set under the declared name | key matches an option name | `an option key matching a declared name is filled` |
| set under the declared name | key matches an alias | `an option key matching an alias is filled under the declared name` |
| `invalid-key` | key matches no name or alias | `an unknown option key is reported as invalid` |
| `invalid-key` | key retains a leading dash | `an option written with three dashes is reported as invalid` |
| `invalid-key` | the terminator was used | `an invocation using the terminator reports it as an invalid key` |
| treat it as t.boolean optional | an option declaring no type | `an option declaring no type is filled as an optional boolean` |
| `missing-argument` naming the option | a declared option absent from argv that is neither optional nor defaulted | `a t option that is absent takes its default or is reported missing` |
| use the default as declared | a declared option absent from argv | `an absent option falls back to its declared default` |
| wrap the default in an array | an array-typed option with a scalar default | `a scalar default on an array option is wrapped in an array` |
| leave it | a declared option present in argv | `an option given in argv is not overwritten by its default` |
| leave it | a declared option absent from argv that declares no default | `an option with no default absent from argv is left unset` |

### UC2 — `lookupCommand`, converting

| Edge | Path (Given) | Scenario |
| --- | --- | --- |
| no value, or an inline `true` or `false`? — yes | boolean type | `a boolean option accepts true and false` |
| boolean takes no following value (C) | boolean type followed by a positional | `a boolean option takes no following value` |
| `invalid-value: expected no value, true or false` | boolean type | `a boolean option given another word is rejected as not a boolean` |
| numeric? — yes | number type | `a number option accepts a numeric value` |
| `invalid-value: expected a number` | number type | `a number option given a non-numeric value is rejected as not a number` |
| the value as typed | string type | `a string option takes its value as typed` |
| convert each occurrence by the element type | array type | `an array option converts each of its values by the element type` |
| one value per occurrence (C) | array type given two occurrences and a bare token | `an array option takes one value per occurrence` |
| optional? — yes, left unset | optional type | `an optional option converts by the type it wraps` |
| `expect-single` (C) | any scalar type | `several values for a single-valued option are reported, and the option gets no value` |
| listed? — yes | enum type given a declared value | `an enum option given one of its declared values is accepted as typed` |
| `invalid-value: expected one of the listed values` | enum type given an unlisted value | `an enum option given an unlisted value is told which values it accepts` |
| the default does not take its place | enum type with a default, given an unlisted value | `a value outside an enum does not fill the slot with its default` |
| `invalid-value` with `keyKind` and `constraint` | any type, a failing value | `a value the declaration rejects is reported in the wording of args-minus, with its kind and constraint` |
| `invalid-value` is one error per failing value | the conversion already rejected the value | `a value the conversion rejected is reported once, not twice` |

### UC3 — `lookupOptions`

| Edge | Path (Given) | Scenario |
| --- | --- | --- |
| an option is declared under exactly that key? — yes | the command declares the option | `a key matching a declared name resolves to that option` |
| an option lists it among its aliases? — yes | the option declares that alias as a plain string | `a key matching an alias resolves to the option's declared name` |
| an option lists it among its aliases? — yes | the option declares that alias in its hidden form | `a key matching a hidden alias resolves like any other alias` |
| empty tuple: the key names nothing here | the command declares no options at all | `a key looked up on a command declaring no options resolves to nothing` |
| empty tuple: the key names nothing here | the command declares options, none matching | `a key matching neither a name nor an alias resolves to nothing` |
