import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { compileStyle, parse } from '@vue/compiler-sfc'

for (const filename of [
  'src/views/plugins/components/RepositoryFact.vue',
  'src/views/adapters/components/AdapterMarketFacts.vue'
]) {
  test(`${filename}: compiled row styles keep the facts container intact`, () => {
    const { descriptor } = parse(readFileSync(filename, 'utf8'))
    const style = descriptor.styles.find(block => block.src?.endsWith('/factRows.css'))
    assert.ok(style)
    const url = new URL(style.src, new URL(`../${filename}`, import.meta.url))
    const compiled = compileStyle({
      filename: url.pathname,
      source: readFileSync(url, 'utf8'),
      id: 'data-v-layout-test',
      scoped: Boolean(style.scoped)
    })
    assert.deepEqual(compiled.errors, [])
    assert.match(compiled.code, /\.facts\s*>\s*div\s*\{/)
    assert.match(compiled.code, /\.facts\s+dd\s*\{/)
    assert.doesNotMatch(compiled.code, /(?:^|\n)\.facts\s*\{/)
  })
}
