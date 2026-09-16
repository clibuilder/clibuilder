---
spec-type: behavioral
concept: [declaration-driven, error-reporting, agent-interface]
---

# Presentation

Governs `ts/render/help.ts`, `ts/render/format.ts`, `ts/render/error.ts`,
`ts/drivers/logger.ts` and `ts/core/ports.ts` — rendering help and usage,
describing a usage error in words, emitting messages at their log level, and
serializing a reported collection in the format its reader asked for. Generating the text is pure and lives in `render/`; writing it is the
logger's, and `core/ports.ts` declares the `UI` a command author calls.

## What

Everything a CLI says passes through here. That splits into three jobs that look
unrelated but share one constraint: the CLI does not know who is reading.

**Messages** are emitted at a level, and the level is not known until argv has
been parsed — yet the framework has things to say before that. So the builder's
UI **buffers** every message and replays it once the level is settled, rather
than deciding too early and losing the ones it guessed wrong about.

**Help** is generated from the declaration, never written by hand. That is the
payoff for the framework reading declarations: a command that declares an
argument gets it documented, aligned, and marked required or optional without
its author writing a line of prose.

**Reported collections** are rendered in the format the reader asked for. The
default is TOON rather than prose, because a CLI's own metadata is read by an
agent far more often than by a person, and TOON is the cheaper read for one. It
is a default, not a replacement: `text` is the prose a human wants, and `json`
is what survives a pipe into `jq`. Counts are part of the TOON syntax, so a
reader never has to count entries or wonder whether a list was truncated.

**Non-goals.** Deciding *when* to show help or what to report belongs to
`execution/` and `builtin-commands/`. What may be declared belongs to
`command-definition/`.

**Key terms.** The **display level** is how much the CLI says — none, info,
debug, or trace. A **signature** is a name as it appears in help, bracketed by
whether it is required and hinted with its type. **TOON** is the default
structured output shape; a **help line** is its trailing next-step suggestion.

## Use Cases

**Actors.**

| Actor | Reaches this capability | Goal |
| --- | --- | --- |
| CLI end user | reads help and messages | learn how to invoke the command without leaving the terminal |
| Agent or script | reads TOON or JSON output | parse the answer without branching on how many results there were |
| Command author | calls `this.ui.info` / `warn` / `error` | say something to the user at the right level |
| `execution` | calls `showHelp`, `showVersion`, `dump` | render at the moment it has decided to |
| `input-parsing` | hands over the usage errors it produced | have each failure described in the user's terms |
| `builtin-commands` | calls the TOON and prose helpers | report a collection in one house style across commands |

The agent is why the structured formats exist at all and why they are the
*default*; a capability serving only the terminal reader would have stopped at
prose.

### UC1 — `createBuilderUI`: say things before the level is known

**Actor / goal.** The framework wants to log during assembly, before argv has
told it how much to say.

| | |
| --- | --- |
| Trigger | messages emitted before `dump()` |
| Inputs | the message and its level |
| Outcome | the message is held, then replayed once the level is settled |

**Extensions.** After `dump()` the buffer is closed and messages pass straight
through; replay preserves both the order and the level each message was emitted
at.

### UC2 — the display level: control how much is said

**Actor / goal.** A user wants to turn logging off or turn diagnostics on.

| | |
| --- | --- |
| Trigger | setting or reading `displayLevel` |
| Inputs | one of none, info, debug, trace |
| Outcome | the underlying logger's threshold moves |

**Extensions.** Setting the level to `info` is a **no-op** — the setter has
cases for none, debug, and trace only. It is benign because the logger is
constructed at info, so the value is already what was asked for, but it means
the level cannot be lowered back to info once raised.

### UC3 — `showHelp`: render a command's help from its declaration

**Actor / goal.** A user wants to know how to invoke this command, and a command
author wants that without writing it.

| | |
| --- | --- |
| Trigger | `showHelp(cliName, command)` |
| Inputs | the application's name and the command declaration |
| Outcome | usage, description, commands, arguments, options, aliases, and config, in that order |

**Extensions.**

| Cause | Outcome |
| --- | --- |
| a section has nothing to show | it is dropped, not rendered empty |
| the command is nested | usage names the whole chain from the application through every ancestor |
| the command declares sub-commands | usage says a command is expected, and they are listed with their aliases |
| an argument or option is required | usage marks the group with angle brackets rather than square ones |
| the command declares a config schema | the schema's shape is rendered as a type |

### UC4 — the signature format: mark what is required and what it takes

**Actor / goal.** A reader scanning help wants to see at a glance whether
something is required and what kind of value it takes.

| | |
| --- | --- |
| Trigger | rendering an argument or option name into help |
| Inputs | the name and its declared type |
| Outcome | a bracketed signature with a type hint |

**Extensions.**

| Cause | Outcome |
| --- | --- |
| no type is declared | an argument is treated as required, an option as optional — matching how each is filled |
| the type is an array | a variadic marker is shown |
| the type is a boolean **option** | no type hint — an option is a flag, so `=boolean` would be noise |
| the type is a boolean **argument** | the hint is shown, because it is a value the user has to type out |
| the option declares aliases | they are shown with the name, shortest first, each dashed by its own length |
| an alias is marked hidden | it is left out |
| the option declares a default | the description names it, quoted when it is a string |

### UC5 — `showVersion`: report the application's version

**Actor / goal.** A user checking which build they are running wants an answer
either way — including when the application has no version to give, which is
still information rather than a failure.

| | |
| --- | --- |
| Trigger | `showVersion(version)` |
| Inputs | the version, if the application has one |
| Outcome | the version, or a phrase saying there is none |

**Extensions.** An application built without a version says so rather than
printing nothing, which would read as a failure.

### UC6 — the output helpers: render a reported collection

**Actor / goal.** A command reporting a collection wants one house style across
every command that reports one, in whichever format the reader asked for.

| | |
| --- | --- |
| Trigger | `toonArray` / `toonTable` / `toonHelp` / `reportProse`, and the shared `--format` option |
| Inputs | the collection and the reader's format |
| Outcome | the rendered lines |

**Extensions.**

| Cause | Outcome |
| --- | --- |
| a value contains a comma, quote, or backslash, or is surrounded by whitespace | it is quoted and escaped, so it cannot read as two entries |
| prose is asked for | the wording differs across none, exactly one, and several |
| a collection is rendered as TOON | the count is part of the syntax |

**Surface trace.**

| Element | Required by | May not combine with |
| --- | --- | --- |
| `createBuilderUI` / `dump` | UC1 | — |
| `createUI` and `displayLevel` | UC2 | — |
| `debug` / `info` / `warn` / `error` | UC1, UC2 | — |
| `showHelp` | UC3, UC4 | — |
| `showVersion` | UC5 | — |
| `toonValue` / `toonArray` / `toonTable` / `toonHelp` | UC6 | — (`toonTable` accepts a single column; preferring `toonArray` there is a token-cost choice, not a rule) |
| `reportProse` | UC6 | — |
| `formatOption` / `OutputFormat` | UC6 | — |
| `formatLookupError` | UC7 | — |
| `OutputUI` | UC6 | — |

### UC7 — `formatLookupError`: describe a usage error in words

**Actor / goal.** The CLI end user, reached through `input-parsing`, wants a
failed invocation explained in the terms they typed it in — which key, which
argument, how many values — rather than as an error record.

| | |
| --- | --- |
| Trigger | `formatLookupError(error, command)` |
| Inputs | one of the five lookup error types, and the command it was matched against |
| Outcome | a line naming what went wrong in the user's own vocabulary |

**Extensions.** An unknown key is dashed by its length, so a single character
reads as a short option and several as a long one. An extra-arguments error is
pluralized by how many values it carries. An invalid value names an argument or an option
depending on whether the key is a declared argument. A too-many-values error
always names an option: a non-array argument consumes exactly one positional, so
it can never carry the several values that raise one.

## Control Flow

### Sub-graph A — buffered messages and levels, entered by UC1 and UC2

```mermaid
graph TD
  M[a message is emitted] --> P{has dump been called?}
  P -- no --> HOLD[hold it with its level]
  P -- yes --> THRU[pass it straight through]
  D[dump] --> CLOSE[close the buffer] --> REPLAY[replay every held message, in order, at its level]
  SL[set the display level] --> W{which level?}
  W -- none --> LN[silence the logger]
  W -- debug --> LD[raise to debug]
  W -- trace --> LT[raise to trace]
  W -- info --> NOOP[no case matches; nothing changes]
  RL[read the display level] --> TH{"where is the logger's threshold?"}
  TH -- "at or below none" --> RN[none]
  TH -- "at or below info" --> RI[info]
  TH -- "at or below debug" --> RD2[debug]
  TH -- above that --> RT[trace]
```

The setter and the reader are not symmetric: the reader derives the level from
the logger's own threshold, which is why a level the setter ignored still reads
back as whatever the threshold actually is.

### Sub-graph B — generate help (`showHelp`), entered by UC3

```mermaid
graph TD
  H[cli name and command] --> U[usage: the name chain from the cli through every ancestor]
  U --> SUB{declares sub-commands?}
  SUB -- yes --> UC["append a command placeholder"]
  SUB -- no --> UN[nothing appended]
  U --> AR{declares arguments?}
  AR -- no --> UN
  AR -- yes --> ARQ{any required?}
  ARQ -- yes --> ARR[angle-bracketed]
  ARQ -- no --> ARO[square-bracketed]
  U --> OP{declares options?}
  OP -- no --> UN
  OP -- yes --> OPQ{any required?}
  OPQ -- yes --> OPR[angle-bracketed]
  OPQ -- no --> OPO[square-bracketed]
  H --> S[build each section]
  S --> SD[description, when declared]
  S --> SC[commands, with their aliases, when any]
  S --> SA[arguments, column-aligned, when declared]
  S --> SO[options, column-aligned, when declared]
  S --> SL2[alias, when declared]
  S --> SG[config, rendered as a type, when declared]
  SD --> F[drop every empty section, then join]
  SC --> F
  SA --> F
  SO --> F
  SL2 --> F
  SG --> F
```

### Sub-graph C — a signature (`formatSignature`), entered by UC4

```mermaid
graph TD
  N[name and declared type] --> T{type declared?}
  T -- no --> DFT{argument or option?}
  DFT -- argument --> REQ[required]
  DFT -- option --> OPT[optional]
  T -- yes --> ISO{optional type?}
  ISO -- yes --> OPT
  ISO -- no --> REQ
  REQ --> BR["angle brackets"]
  OPT --> SQ["square brackets"]
  N --> HINT{what kind of type?}
  HINT -- array --> VAR[variadic marker, with the element type when known]
  HINT -- "boolean, as an option" --> NOH[no hint: it is a flag]
  HINT -- "boolean, as an argument" --> YESH[hint shown]
  HINT -- "string or number" --> TH[hint shown]
  HINT -- none --> NOH2[no hint]
```

### Sub-graph E — an option's name and description in help, entered by UC4

An argument renders its name alone; an option carries its aliases beside it and
may name a default. Both then go through sub-graph C for their brackets.

```mermaid
graph TD
  K[an option, as declared] --> AL{declares aliases?}
  AL -- no --> NAME[the name alone]
  AL -- yes --> HID{"each alias: marked hidden?"}
  HID -- yes --> LEFT[left out]
  HID -- no --> KEPT[kept]
  KEPT --> ORD["sorted shortest first, each dashed by its own length — one dash for a single character, two otherwise"]
  DE[its description] --> DEF{declares a default?}
  DEF -- no --> DESC[the description alone]
  DEF -- yes --> DQ{"is the declared type a string?"}
  DQ -- yes --> DS["the description, then the default in quotes"]
  DQ -- no --> DP["the description, then the default as written"]
```

### Sub-graph D — render a collection, entered by UC6

```mermaid
graph TD
  V[a value] --> AMB{"contains a comma, quote, or backslash, or is surrounded by whitespace?"}
  AMB -- yes --> Q[quote and escape it]
  AMB -- no --> RAW[leave it as is]
  C[a collection] --> FMT{which format?}
  FMT -- toon --> SH{which helper?}
  FMT -- text --> N
  FMT -- json --> J["the payload as JSON, with no help line"]
  SH -- array --> TA[one line, carrying the count]
  SH -- table --> TT[a header naming the columns, then one indented row each, carrying the count]
  SH -- help --> TH2[a counted one-entry line]
  N{how many?}
  N -- none --> P0[say none were found, naming the keywords]
  N -- one --> P1[say one was found, and describe it]
  N -- several --> P2[say several were found, then list them]
  FO["the shared --format option"] --> WF{which format did the reader ask for?}
  WF -- "nothing given" --> FDEF[toon, the default the option declares]
  WF -- given --> FGIV["the format asked for; a value outside the three never reaches here, refused by the option's own schema"]
  FDEF --> FMT
  FGIV --> FMT
```

### Sub-graph F — report a version (`showVersion`), entered by UC5

```mermaid
graph TD
  VS[the version the application was built with] --> HV{is there one?}
  HV -- yes --> VP[print it]
  HV -- no --> VN["say the application has no version, rather than printing nothing"]
```

### Sub-graph G — describe a usage error (`formatLookupError`), entered by UC7

```mermaid
graph TD
  F[lookup error] --> K{which type?}
  K -- invalid-key --> IK[unknown option, dashed by key length]
  K -- missing-argument --> MA["missing required argument &lt;name&gt;"]
  K -- extra-arguments --> EA[unexpected argument, pluralized by count]
  K -- invalid-value --> IV{is the key a declared argument?}
  K -- expect-single --> ESO[described as an option, always: only a repeated option can carry several values]
  IV -- yes --> IVA["described as argument &lt;name&gt;"]
  IV -- no --> IVO[described as an option]
  IK --> LEN{key is one character?}
  LEN -- yes --> ONE[single dash]
  LEN -- no --> TWO[double dash]
```

## Scenario map

### UC1 — `createBuilderUI`

| Edge | Path (Given) | Scenario |
| --- | --- | --- |
| hold it with its level | before `dump` | `a message emitted before the level is settled is held rather than printed` |
| replay every held message, in order, at its level | `dump` called | `dumping replays every held message in order and at its own level` |
| pass it straight through | after `dump` | `a message emitted after dumping is printed straight away` |

### UC2 — the display level

| Edge | Path (Given) | Scenario |
| --- | --- | --- |
| silence the logger | level set to none | `setting the level to none silences the logger` |
| raise to debug | level set to debug | `setting the level to debug shows debug messages` |
| raise to trace | level set to trace | `setting the level to trace shows trace messages` |
| no case matches | level set to info | `setting the level to info changes nothing` |
| none | the level set to none | `reading the level back after silencing reports none` |
| debug | the level set to debug | `reading the level back after raising to debug reports debug` |
| trace | the level set to trace | `reading the level back after raising to trace reports trace` |
| info | a ui whose level has not been set | `a ui reports info before any level is set` |
| no case matches | the level set to info on a ui already raised | `setting the level to info leaves a level already raised where it was` |

### UC3 — `showHelp`

| Edge | Path (Given) | Scenario |
| --- | --- | --- |
| the name chain from the cli through every ancestor | a nested command | `usage names the whole chain from the application through every ancestor` |
| append a command placeholder | the command declares sub-commands | `usage says a command is expected when the command has sub-commands` |
| angle-bracketed | at least one required argument | `usage marks arguments as required when any of them is` |
| square-bracketed | no required argument | `usage marks arguments as optional when none of them is required` |
| angle-bracketed | at least one required option | `usage marks options as required when any of them is` |
| square-bracketed | no required option | `usage marks options as optional when none of them is required` |
| description, when declared | the command declares one | `a declared description is shown` |
| commands, with their aliases | sub-commands declared, some with aliases | `sub-commands are listed with their aliases` |
| arguments, column-aligned | arguments declared | `declared arguments are listed with their descriptions, aligned` |
| options, column-aligned | options declared | `declared options are listed with their descriptions, aligned` |
| alias, when declared | the command declares aliases | `a command's own aliases are shown` |
| config, rendered as a type | a config schema declared | `a declared config schema is shown as a type` |
| drop every empty section | a command declaring almost nothing | `a section with nothing to show is left out rather than rendered empty` |

### UC4 — the signature format

| Edge | Path (Given) | Scenario |
| --- | --- | --- |
| argument, with no type declared | an argument with no declared type | `an argument with no type is shown as required` |
| option, with no type declared | an option with no declared type | `an option with no type is shown as optional` |
| square brackets | an optional type | `an optional type is shown in square brackets` |
| angle brackets | a non-optional type | `a required type is shown in angle brackets` |
| hint shown | a string or number type | `a string or number type is hinted beside the name` |
| variadic marker | an array type | `an array type is marked variadic` |
| no hint: it is a flag | a boolean option | `a boolean option is shown without a type hint, because it is a flag` |
| hint shown | a boolean argument | `a boolean argument keeps its type hint, because it must be typed out` |
| sorted shortest first, each dashed by its own length | an option declaring aliases | `an option's aliases are shown with it, shortest first and dashed by length` |
| marked hidden: left out | an option declaring a hidden alias | `a hidden alias is not shown` |
| the description, then the default as written | an option declaring a non-string default | `an option's default is named in its description` |
| the description, then the default in quotes | a string option with a default | `a string default is quoted in the description` |

### UC5 — `showVersion`

| Edge | Path (Given) | Scenario |
| --- | --- | --- |
| print it | the application has one | `an application with a version prints it` |
| say the application has no version | the application has none | `an application without a version says so rather than printing nothing` |

### UC6 — the output helpers

| Edge | Path (Given) | Scenario |
| --- | --- | --- |
| quote and escape it | a value containing a comma, quote, or backslash | `a value that could read as two entries is quoted and escaped` |
| quote and escape it | a value surrounded by whitespace | `a value surrounded by whitespace is quoted` |
| leave it as is | an ordinary value | `an ordinary value is left unquoted` |
| one line, carrying the count | an array rendered | `a rendered array carries its count, so nothing looks truncated` |
| a header naming the columns, then one indented row each | a table rendered | `a rendered table names its columns and indents one row per entry` |
| a counted one-entry line | a help line rendered | `a help line is counted like any other rendered list` |
| say none were found | prose, empty collection | `prose for an empty collection names the keywords searched` |
| say one was found | prose, one item | `prose for one item describes it in the singular` |
| say several were found | prose, several items | `prose for several items lists them under a plural heading` |
| toon, the default the option declares | any command reporting a collection | `every command reporting a collection offers the same three formats and defaults to toon` |
| the payload as JSON, with no help line | json asked for | `json output carries the payload alone` |

### UC7 — describing a usage error

| Edge | Path (Given) | Scenario |
| --- | --- | --- |
| single dash | unknown key of one character | `an unknown single-character option is described with one dash` |
| double dash | unknown key of several characters | `an unknown multi-character option is described with two dashes` |
| missing argument | any | `a missing argument is described by its name in angle brackets` |
| pluralized by count | one extra value | `one unexpected argument is described in the singular` |
| pluralized by count | several extra values | `several unexpected arguments are described in the plural` |
| described as argument &lt;name&gt; | the key is a declared argument | `an invalid value on an argument is described as an argument` |
| described as an option | the key is not a declared argument | `an invalid value on an option is described as an option` |
| described as an option, always | any expect-single error | `too many values are described with the values that were given` |
