# `args-minus`

A less-is-more way to parse command line input.

## Why?

There are many command line parsers out there, why `args-minus`?

In short, they are doing too much.
Too much in a sense that they impose certain assumptions to the input.

For example, some parsers assume git-style sub commands,
and others has various options to parse the whole input one way or the other.

To put in another way, they are opinionated in some shape or form.

It's not like opinionated tools are bad.
In fact, they are quite popular.
By taking away certain flexibility,
it simplifies the consumption (in code) and normalizes usage (for user).

The problem is where to define that opinion.
There are 3 obvious candidates: library, framework, or application.

Application has all the rights to be opinionated.
It is an application providing certain specific values to the end user after all.

Framework can be opinionated.
An opinionated framework is good at building certain application, but bad at others.
But that's ok. That's the price to pay to get the benefits of using a certain framework.

Library should not be opinionated.
Library should do one thing and do it well.
It should support as many scenarios as possible,
and should defer decisions to frameworks or applications.

Some command line parsing packages are frameworks, which are fine,
but other packages are designed as a library, but act more like a framework.

`args-minus` is designed to be a library.
Its sole purpose is to provide a convenient and consistent way to parse command line input,
in the way you want to parse it.

## Installation

```sh
npm install args-minus

pnpm add args-minus

yarn add args-minus

deno add args-minus

bun add args-minus
```
