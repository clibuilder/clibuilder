---
name: codecov-coverage-compare
description: Use this skill when comparing local coverage against the Codecov report stored for a branch base.
metadata:
  internal: true
---

# Codecov Coverage Compare

## When to use

Apply when a contributor needs to detect a project-coverage regression before CI.

## Workflow

1. Detect the repository package manager and run its `coverage:compare` script.
2. Set `CODECOV_API_TOKEN` when the API requires authentication. If absent, retain the script warning and use its unauthenticated result only when the request succeeds.
3. Use `--base <sha>` to compare against a specified Codecov commit; otherwise use the merge-base with `origin/main`.
4. For an agent-readable result, run the comparison script with `--format json` and read its JSON object.

## Constraints

- Compare aggregate project line coverage only.
- Do not upload local coverage reports.
- Treat a missing base report or API failure as an error, not a passing comparison.
