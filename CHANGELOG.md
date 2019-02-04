# Change Log

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

<a name="0.0.0"></a>
# [0.0.0](https://github.com/unional/clibuilder/compare/v3.0.0...v0.0.0) (2019-02-04)


### Features

* major refactor ([#199](https://github.com/unional/clibuilder/issues/199)) ([f081b14](https://github.com/unional/clibuilder/commit/f081b14))


### BREAKING CHANGES

* setupCliCommandTest signagure changed

There are also a few more type related changes.
Mostly config and context are now an explicit property on the `Cli` and the commands.

Before this, the context was merged to the command itself.

* fix: expose error classes that didn't expose before.

* refactor: move files to arg-parser and presenter

Also, rename the folders to follow package conventions.

Check folder is treated as a sub-package.
It tests its own code and gets the code from '.' when possible.

The top level should do acceptance tests.
