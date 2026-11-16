# build-cli

Teaches an agent to build, extend and test a command-line tool with clibuilder 12, spec first, for a consumer of the `clibuilder` package who asks for a CLI, a command, an option or a test. For each command it creates or changes, the result is a spec beside the command that names its default `--format`, tests derived from that spec, and TypeScript source that uses only clibuilder's real exports, with typed arguments and options and coded `CliError` failures. How the output should read for an AI agent is the `axi` skill's job.

## Research

Skipped: the skill existed before the research step, and the spec-first workflow was decided by its owner in [clibuilder#766](https://github.com/clibuilder/clibuilder/issues/766), after the default format went unstated in command specs in [buddy-agent-harness#328](https://github.com/repobuddy/buddy-agent-harness/pull/328).

## Maintaining it

The API it teaches comes from the docs in `apps/website/src/content/docs/` and from `packages/clibuilder/src/`; update it with them. `evals/` holds its test cases and does not ship to npm.
