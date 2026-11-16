# Command spec

Read this when a command is created or changed, before its tests or code.

## Where it lives

One spec per command, in the command's own home: a Markdown file beside the file that defines the command, named after
its full path, such as `src/serve.md` for `serve` and `src/repo-create.md` for `repo create`. When the repository already
keeps command specs in another place or form, such as a specs folder, follow it and keep one spec per command.

## What it says

```md
# `app list`

Lists the open tasks, for a person or an agent who wants to pick one to work on.

- **Default format:** `toon`, the CLI's default.
- **Arguments:** none.
- **Options:** `--limit <int 1..100>`, 20 by default: the most tasks to list.

## Criteria

- **S1.** Called without `--format`, it answers in `toon`.
- **S2.** It lists at most `--limit` tasks, newest first.
- **S3.** With no open task, it answers `empty` and exits 0.
- **S4.** A `--limit` outside 1 to 100 is a usage error: exit 2, code `invalid-value`.
```

- **Default format.** Name it by name (`toon`, `json` or `text`) in every spec, also when it is the package-wide
  default. A reader changing this command reads this spec, not the entry file, so a default stated only there or in a
  shared spec is not found. The default is the `format` the entry file passes to `cli()`, and `toon` when it passes
  none. A command that answers with a string or `document()` prints it verbatim in every format: name the default
  anyway, since errors and `help` still follow it, and say the answer is verbatim.
- **Criteria.** Each is one statement that a test can pass or fail, with an ID `S1`, `S2`, and so on, unique within
  the spec. One criterion says what the command answers in when called without `--format`. Add one for each argument
  rule, each option rule, each failure with its `code` and exit code, and each result shape.
- Keep encodings the tests pin, such as the exact help text, out of the criteria; say the property instead.

## Tests from the spec

Write one test per criterion, its title opening with the criterion's ID, as `test('S2 lists at most --limit tasks', ...)`,
in a `describe` named after the command.

For the default-format criterion, run the command with no `--format` in `argv`, and assert what only that format
produces. `testCommand` runs the command on a test CLI whose default is `toon`: pass `{ format }` set to the same value
as the entry file's `cli({ format })` when it sets one.

```ts
test('S1 answers in toon without --format', async () => {
  const { messages, exitCode } = await testCommand(list, 'list')
  expect(exitCode).toBeUndefined()
  expect(messages).toContain('items[2]') // toon; json would be '{"items":[...'
})
```

For `json`, assert that `JSON.parse(messages)` returns the answer. For `text`, assert the rendered text.
