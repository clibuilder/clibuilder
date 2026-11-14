# axi

Teaches an agent clibuilder's version of the AXI (Agent eXperience Interface) conventions: the ten upstream rules plus three changes. It serves anyone designing or reviewing CLI output that an AI agent reads. The result is a CLI, or a review of one, whose output follows those rules through the helpers in `clibuilder/axi`. General clibuilder usage is the `build-cli` skill's job.

The rules come from `apps/website/src/content/docs/getting-started/axi.md` and `api/axi.md`; update the skill with them. `evals/` holds its test cases and does not ship to npm.
