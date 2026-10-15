---
title: Naming Commands
description: "Name commands noun first: <noun> <verb>, with a top-level verb only where the CLI itself is the noun."
---

[Commands](/clibuilder/guides/commands/) shows how to build the command tree. This page is about
what to call its nodes. The rule holds for any CLI, built with `clibuilder` or not.

## The rule

Name a command `<noun> <verb>`: the thing it acts on, then what it does to it.

```sh
app repo create my-repo
app repo remove my-repo
app pr check 42
```

The noun groups every operation on one kind of thing. A reader who knows the noun can list its verbs
with `app repo --help`. An agent can do the same, and guesses fewer commands that do not exist.

## When a top-level verb is right

Use a top-level verb, or a top-level noun, only where the CLI itself is the noun. `git commit` commits
to git. `app status` reports the status of the whole app. No other noun would be more precise.

If you can name a narrower thing the command acts on, make that thing the noun:

| Instead of | Write | Because |
|---|---|---|
| `app jump <session>` | `app session focus <session>` | The command acts on a session. |
| `app pods` | `app pod list` | Plural top-level nouns duplicate the singular group (`app pod bind`). |
| `app captain` | `app captain show` | A bare noun is ambiguous once the noun gains a second verb. |
| `app pr clean` | `app pr check` | Pick a verb that says what happens. "clean" reads as an action on the pull request. |

## Never a bare noun

A noun on its own is not a command. Give it a verb, even when it has only one today. A bare noun
that later gains a second verb has to change meaning or stay an odd one out.

## Automatons take prose

The rule covers commands that act on things. An agent persona or skill is addressed differently:
its name routes the request, and what follows is free prose, as in `/reviewer check the auth
change`. Do not force a persona's instructions into a noun-verb shape.
