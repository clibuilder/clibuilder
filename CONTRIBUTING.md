# Contributing

## `clibuilder` dev dependencies

The `clibuilder` package adds the test plugins as its `devDependencies`.
For example:

```js
{
  "devDependencies": {
    "cjs-plugin": "workspace:*"
  }
}
```

This looks weird because `clibuilder` is not using those plugins even during tests.

They are used in the `test-clis` and `test-apps`.

The problem is that since `clibuilder` is a workspace package,
`pnpm` uses a symlink to reference it.
And that seems to cause issue when resolving the plugins.

My guess is that this issue only occurs in this repo.
It should be working in both actual CLI app repos and its consumer repos.

Will see if I can test that before release.
