# Contributing Guide

This repository uses [pnpm] and [turborepo].

The best way to get [pnpm] is by enabling [corepack]:

```sh
# install corepack for Node.js before 14.19.0 and 16.9.0 to use pnpm
npm install -g corepack

# enable pnpm with corepack
corepack enable

# or, you can also install pnpm directly
npm install -g pnpm
```

## Scripts

```sh
# setup repository
pnpm install

# verify everthing
pnpm verify

# test
pnpm test

# run scripts specific to clibuilder
pnpm clibuilder <script>

# e.g. run test in watch mode
pnpm clibuilder test --watch

# create changeset
pnpm cs
```

[corepack]: https://nodejs.org/api/corepack.html
[pnpm]: https://pnpm.io
[turborepo]:https://turborepo.org
