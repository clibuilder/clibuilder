---
"@clibuilder/codemod": minor
---

`--dry-run --diff-file <path>` writes the diff to a file and prints the findings on stdout, so the answer is on stdout and `git apply <path>` still works. `--dry-run` alone is unchanged: the diff on stdout, the report on stderr.
A path that does not exist is now a `path-not-found` error (exit 1) that lists the missing paths and writes nothing, instead of an `unreadable-files` error after the other files were changed. `unreadable-files` is left for files that exist but cannot be read or parsed.
