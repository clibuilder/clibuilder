# Change Log

## 8.0.3

### Patch Changes

- d8b5de1: Update `type-plus` and `standard-log`

## 8.0.2

### Patch Changes

- e39a3c9: Add `tmp` as dependencies.
  It is used by `testCommand()` which is part of public API.

## 8.0.1

### Patch Changes

- 7686ce0: Update README

## 8.0.0

### Major Changes

- 10d018e: `name` and `version` is now required, will not load from the CLI's `package.json` anymore.
  This allows the CLI to be used as standalone app.

  Change `configName` to `config`.
  If not specified, config will not be loaded.
  You can set it to `true` or to a specific config file name.

  Config is now used to control which plugin to load,
  similar to other tools such as `eslint` and `jest`.
  It accepts `json`, `yaml`, or `js` file.

  To specify plugins, add them under the `plugins` property:

  ```json
  {
    "plugins": ["your-plugin"]
  }
  ```

  As such, `loadPlugins()` is removed.

  Change `keyword` to `keywords`. It is now used for searching and listing of plugins,
  instead of controlling whether to load config.

- e121c23: Load plugins explicitly.
  This will be removed complete later on when adding config file support.

  Remove `findByKeywords()` in `loadPlugins()` as a result (for loading local plugins automatically).

- d14a215: Remove global plugin searches.
  In 8.0, we are dropping keyword-based plugin loading.
  Instead, we will support loading plugins based on config file.

  Updated dependencies.

### Patch Changes

- bccc80f: fix(clibuilder): export types

  The top-level `typings` field is not picked up by ESM use case.

## 7.2.1

### Patch Changes

- 24c2c89: Upgrade `zod` to `3.17.2`
- c32309c: Update these dependencies:

  - `global-store`: `1.0.0-beta.17` -> `1.0.0.beta.21`
  - `standard-log`: `5.4.0` -> `7.1.0`
  - `standard-log-color`: `2.1.0` -> `4.0.0`
  - `tslib`: `2.1.0` -> `2.4.0`
  - `type-plus`: `3.13.1` -> `4.9.1`

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

<a name="4.1.1"></a>

## [4.1.1](https://github.com/unional/clibuilder/compare/v4.1.0...v4.1.1) (2019-02-05)

### Bug Fixes

- CliCommandInstance.config can be undefined. ([#201](https://github.com/unional/clibuilder/issues/201)) ([185e7e4](https://github.com/unional/clibuilder/commit/185e7e4))

<a name="4.1.0"></a>

# [4.1.0](https://github.com/unional/clibuilder/compare/v4.0.0...v4.1.0) (2019-02-04)

### Features

- add searchPackage command for plugins ([#200](https://github.com/unional/clibuilder/issues/200)) ([4c3723c](https://github.com/unional/clibuilder/commit/4c3723c))

<a name="4.0.0"></a>

# [4.0.0](https://github.com/unional/clibuilder/compare/v3.0.0...v4.0.0) (2019-02-04)

### Features

- major refactor ([#199](https://github.com/unional/clibuilder/issues/199)) ([f081b14](https://github.com/unional/clibuilder/commit/f081b14))

### BREAKING CHANGES

- setupCliCommandTest signature changed

There are also a few more type-related changes.
Mostly config and context are now an explicit property on the `Cli` and the commands.

Before this, the context was merged to the command itself.

- fix: expose error classes that didn't expose before.

- refactor: move files to arg-parser and presenter

Also, rename the folders to follow package conventions.

Check folder is treated as a sub-package.
It tests its code and gets the code from '.' when possible.

The top-level should do acceptance tests.
