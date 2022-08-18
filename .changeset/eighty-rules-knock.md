---
"clibuilder": major
---

Will not look for app's `package.json` to read information about the app if not provided.

The app now must provide all information when calling `cli(...)`.

This enables the app to be build and distributed without `npm`.
It can be a standalone application, just a single JavaScript file.
It can be loaded using `bun`.
