/**
 * The framework-free AXI value helpers: truncation, counts, the empty state, and the home header.
 *
 * Every module in this directory imports only Node built-ins and its siblings, never the rest of
 * clibuilder, so a neutral package can be extracted by moving the files (axi-native RFC section 4.1).
 * `biome.json` enforces the boundary.
 */
export * from './home.js'
export * from './truncate.js'
