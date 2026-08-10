# Glossary

- **Argument vector (argv):** the ordered strings supplied to a command.
- **Token:** a lossless classification of one argv entry, including its index and
  original spelling where needed.
- **Option:** a named command-line input introduced by a modifier such as `--`.
- **Positional:** an argv entry that is not interpreted as an option.
- **Terminator:** the entry that ends option interpretation; later entries are
  passed through as positionals.
- **Policy parser:** a consumer that applies an application's option declarations
  to generic tokens.
