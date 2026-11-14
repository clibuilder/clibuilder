# build-cli

Teaches an agent to build, extend and test a command-line tool with clibuilder 12, for a consumer of the `clibuilder` package who asks for a CLI, a command, an option or a test. The result is TypeScript source that uses only clibuilder's real exports, with typed arguments and options, coded `CliError` failures, and in-process tests through `clibuilder/testing`. How the output should read for an AI agent is the `axi` skill's job.

The API it teaches comes from the docs in `apps/website/src/content/docs/` and from `packages/clibuilder/src/`; update it with them. `evals/` holds its test cases and does not ship to npm.
