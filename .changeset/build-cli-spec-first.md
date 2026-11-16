---
"clibuilder": minor
---

The `build-cli` skill now works spec first. For each command it creates or changes, the agent writes or updates the command's spec beside it, derives one test per spec criterion, then implements and runs the tests. Each command's spec names its own default `--format`, also when it is the CLI's default, and a test checks that default. When an existing command's spec, tests and entry file disagree on the default, the agent reports the mismatch and asks instead of picking one.
