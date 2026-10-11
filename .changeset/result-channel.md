---
'clibuilder': minor
---

Add the result channel under `cli({ output: 'axi' })`: a non-`undefined` value returned from `run()` is the answer, printed once on stdout in `this.format`, with nothing on stderr. `parse()` still resolves to the value. In the default `output: 'console'` nothing is printed, as before.

- An object is encoded in the format. An array or a scalar is encoded under the `result` key, such as `result[2]: a,b`. A string is written verbatim.
- `result(value, { help, render })` adds next-step lines as a `help` list inside the encoded output (left out when empty), and per-format renderers whose string is written verbatim, followed by the encoded `help`.
- `document(content)` writes the content exactly as given, whatever the format.
- `empty(message, { help })` is a success with an explicit empty state, encoded as `empty: <message>`.

`parse()` resolves to the value each helper wraps, in either output. `run()` reads the output mode as `this.output`.

Under `output: 'axi'` the built-in `plugins list` and `plugins search` return their report as the answer instead of logging it, and an unknown `--fields` value is a `CliError` with code `invalid-value` and exit code 2. Their console output and return values are unchanged.
