import t from 'assert'
import a from 'assertron'
import { MissingArguments } from '../argv-parser'
import { generateDisplayedMessage, setupCliCommandTest } from '../test-util'
import { searchPackageCommand } from './searchPackageCommand'

test('requires at least one keyword', async () => {
  a.throws(() => setupCliCommandTest(searchPackageCommand, []), MissingArguments)
})

test('displays no package found if keyword search does not yield any result', async () => {
  const npmSearch = () => { return [] }

  const { cmd, args, argv, ui } = setupCliCommandTest(searchPackageCommand, ['x', 'y'], undefined, { _dep: { searchByKeywords: npmSearch } })

  await cmd.run(args, argv)

  const message = generateDisplayedMessage(ui.display.infoLogs)
  t.strictEqual(message, `no packages with keywords: x,y`)
})

test('found one package', async () => {
  const npmSearch = () => { return ['pkg-x'] }

  const { cmd, args, argv, ui } = setupCliCommandTest(searchPackageCommand, ['x', 'y'], undefined, { _dep: { searchByKeywords: npmSearch } })

  await cmd.run(args, argv)

  const message = generateDisplayedMessage(ui.display.infoLogs)
  t.strictEqual(message, `found one package: pkg-x`)
})


test('found multiple packages', async () => {
  const npmSearch = () => { return ['pkg-x', 'pkg-y'] }

  const { cmd, args, argv, ui } = setupCliCommandTest(searchPackageCommand, ['x', 'y'], undefined, { _dep: { searchByKeywords: npmSearch } })

  await cmd.run(args, argv)

  const message = generateDisplayedMessage(ui.display.infoLogs)
  t.strictEqual(message, `found multiple packages:

  pkg-x
  pkg-y`)
})
