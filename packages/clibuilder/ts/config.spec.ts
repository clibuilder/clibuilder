import { logLevels } from 'standard-log'
import { ctx, loadConfig } from './config'
import { getFixturePath } from './test-utils'
import { mockUI } from './ui_mock'

describe('loadConfig()', () => {
  async function testLoadConfig(configName: string, { fixturePath }: {
    fixturePath: string,
  }) {
    ctx.cwd = () => getFixturePath(fixturePath)
    const [ui, reporter] = mockUI('loadConfig', logLevels.all)
    return [await loadConfig({ ui }, configName), reporter] as const
  }

  it('loads config from `{configName}.mjs` at cwd', async () => {
    const [actual] = await testLoadConfig('string-bin', { fixturePath: 'has-mjs-config' })
    expect(actual).toEqual({ a: 1 })
  })

  it('loads config from `.{configName}.mjs` at cwd', async () => {
    const [actual] = await testLoadConfig('string-bin', { fixturePath: 'has-dot-mjs-config' })
    expect(actual).toEqual({ a: 1 })
  })

  it('loads config from `{configName}.cjs` at cwd', async () => {
    const [actual] = await testLoadConfig('string-bin', { fixturePath: 'has-cjs-config' })
    expect(actual).toEqual({ a: 1 })
  })

  it('loads config from `.{configName}.cjs` at cwd', async () => {
    const [actual] = await testLoadConfig('string-bin', { fixturePath: 'has-dot-cjs-config' })
    expect(actual).toEqual({ a: 1 })
  })

  it('loads config from `{configName}.js` at cwd', async () => {
    const [actual] = await testLoadConfig('string-bin', { fixturePath: 'has-js-config' })
    expect(actual).toEqual({ a: 1 })
  })

  it('loads config from `.{configName}.js` at cwd', async () => {
    const [actual] = await testLoadConfig('string-bin', { fixturePath: 'has-dot-js-config' })
    expect(actual).toEqual({ a: 1 })
  })

  it('loads config from `{configName}.json` at cwd', async () => {
    const [actual] = await testLoadConfig('string-bin', { fixturePath: 'has-json-config' })
    expect(actual).toEqual({ a: 1 })
  })

  it('loads config from `.{configName}.json` at cwd', async () => {
    const [actual] = await testLoadConfig('string-bin', { fixturePath: 'has-dot-json-config' })
    expect(actual).toEqual({ a: 1 })
  })

  it('loads config from `{configName}.yml` at cwd', async () => {
    const [actual] = await testLoadConfig('string-bin', { fixturePath: 'has-yml-config' })
    expect(actual).toEqual({ a: 1 })
  })

  it('loads config from `.{configName}.yml` at cwd', async () => {
    const [actual] = await testLoadConfig('string-bin', { fixturePath: 'has-dot-yml-config' })
    expect(actual).toEqual({ a: 1 })
  })

  it('loads config from `{configName}.yaml` at cwd', async () => {
    const [actual] = await testLoadConfig('string-bin', { fixturePath: 'has-yaml-config' })
    expect(actual).toEqual({ a: 1 })
  })

  it('loads config from `.{configName}.yaml` at cwd', async () => {
    const [actual] = await testLoadConfig('string-bin', { fixturePath: 'has-dot-yaml-config' })
    expect(actual).toEqual({ a: 1 })
  })

  it('loads config from `{configName}rc.mjs` at cwd', async () => {
    const [actual] = await testLoadConfig('string-bin', { fixturePath: 'has-rc-mjs-config' })
    expect(actual).toEqual({ a: 1 })
  })

  it('loads config from `.{configName}rc.mjs` at cwd', async () => {
    const [actual] = await testLoadConfig('string-bin', { fixturePath: 'has-dot-rc-mjs-config' })
    expect(actual).toEqual({ a: 1 })
  })

  it('loads config from `{configName}rc.cjs` at cwd', async () => {
    const [actual] = await testLoadConfig('string-bin', { fixturePath: 'has-rc-cjs-config' })
    expect(actual).toEqual({ a: 1 })
  })

  it('loads config from `.{configName}rc.cjs` at cwd', async () => {
    const [actual] = await testLoadConfig('string-bin', { fixturePath: 'has-dot-rc-cjs-config' })
    expect(actual).toEqual({ a: 1 })
  })

  it('loads config from `{configName}rc.js` at cwd', async () => {
    const [actual] = await testLoadConfig('string-bin', { fixturePath: 'has-rc-js-config' })
    expect(actual).toEqual({ a: 1 })
  })

  it('loads config from `.{configName}rc.js` at cwd', async () => {
    const [actual] = await testLoadConfig('string-bin', { fixturePath: 'has-dot-rc-js-config' })
    expect(actual).toEqual({ a: 1 })
  })

  it('loads config from `{configName}rc.json` at cwd', async () => {
    const [actual] = await testLoadConfig('string-bin', { fixturePath: 'has-rc-json-config' })
    expect(actual).toEqual({ a: 1 })
  })

  it('loads config from `.{configName}rc.json` at cwd', async () => {
    const [actual] = await testLoadConfig('string-bin', { fixturePath: 'has-dot-rc-json-config' })
    expect(actual).toEqual({ a: 1 })
  })

  it('loads config from `{configName}rc.yml` at cwd', async () => {
    const [actual] = await testLoadConfig('string-bin', { fixturePath: 'has-rc-yml-config' })
    expect(actual).toEqual({ a: 1 })
  })

  it('loads config from `.{configName}rc.yml` at cwd', async () => {
    const [actual] = await testLoadConfig('string-bin', { fixturePath: 'has-dot-rc-yml-config' })
    expect(actual).toEqual({ a: 1 })
  })

  it('loads config from `{configName}rc.yaml` at cwd', async () => {
    const [actual] = await testLoadConfig('string-bin', { fixturePath: 'has-rc-yaml-config' })
    expect(actual).toEqual({ a: 1 })
  })

  it('loads config from `.{configName}rc.yaml` at cwd', async () => {
    const [actual] = await testLoadConfig('string-bin', { fixturePath: 'has-dot-rc-yaml-config' })
    expect(actual).toEqual({ a: 1 })
  })

  it('loads config from `{configName}rc` containing json at cwd', async () => {
    const [actual] = await testLoadConfig('string-bin', { fixturePath: 'has-rc-with-json-config' })
    expect(actual).toEqual({ a: 1 })
  })

  it('loads config from `.{configName}rc` containing json at cwd', async () => {
    const [actual] = await testLoadConfig('string-bin', { fixturePath: 'has-dot-rc-with-json-config' })
    expect(actual).toEqual({ a: 1 })
  })

  it('loads config from `{configName}` at cwd', async () => {
    const [actual] = await testLoadConfig('string-bin.json', { fixturePath: 'has-json-config' })
    expect(actual).toEqual({ a: 1 })
  })

  it('load config from package.json at cwd', async () => {
    const [actual] = await testLoadConfig('string-bin', { fixturePath: 'has-pjson-config' })
    expect(actual).toEqual({ a: 1 })
  })
})
