import * as axi from 'clibuilder/axi'

/**
 * The `--full` option: the escape hatch from truncation.
 *
 * @deprecated import `fullOption` from `clibuilder/axi` instead.
 * It is declared with `t.boolean().optional()` there, and re-exported from it here.
 */
export const fullOption: typeof axi.fullOption = axi.fullOption

/**
 * The number of characters {@link truncateText} keeps by default.
 *
 * @deprecated import `defaultTextLimit` from `clibuilder/axi` instead.
 */
export const defaultTextLimit: typeof axi.defaultTextLimit = axi.defaultTextLimit

/**
 * Cuts a long text down to `limit` characters and says how much there was.
 *
 * @deprecated import `truncateText` from `clibuilder/axi` instead.
 */
export const truncateText: typeof axi.truncateText = axi.truncateText

/**
 * Keeps the first `limit` items and counts the rest.
 *
 * @deprecated import `truncateList` from `clibuilder/axi` instead.
 */
export const truncateList: typeof axi.truncateList = axi.truncateList

/**
 * Says the zero instead of printing an empty list.
 *
 * @deprecated import `orEmpty` from `clibuilder/axi` instead.
 */
export const orEmpty: typeof axi.orEmpty = axi.orEmpty
