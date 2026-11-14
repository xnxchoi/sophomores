import assert from 'node:assert/strict'
import { globSync, readFileSync } from 'node:fs'
import test from 'node:test'

test('I2 handback contains no raw logs, host process audit, or home paths', () => {
  const files = globSync('docs/qa/t004-i2-20261114/**/*').filter(file => /\.(?:md|txt|json|log)$/.test(file))
  assert.equal(files.some(file => file.endsWith('.log') || file.endsWith('process-audit.json')), false)
  for (const file of files) assert.equal(/\/(?:Users|home)\/[^\s/]+/.test(readFileSync(file, 'utf8')), false, file)
})
