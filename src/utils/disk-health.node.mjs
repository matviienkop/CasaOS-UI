import { test } from 'node:test'
import assert from 'node:assert/strict'
import { diskId, diskRows, diskHealth, readSelection } from './disk-health.mjs'

test('selection tracks serial across device renaming without selecting a replacement', () => {
  const selection = [{ id: diskId({ serial: 'first' }), name: 'sda' }]
  const rows = diskRows([{ serial: 'first', name: 'sdb' }, { serial: 'replacement', name: 'sda' }], selection)
  assert.equal(rows.length, 1)
  assert.equal(rows[0].name, 'sdb')
  assert.equal(diskRows([], selection)[0].missing, true)
})
test('default all and explicit empty selection differ', () => {
  assert.equal(diskRows([{ path: '/dev/mmcblk0' }], null).length, 1)
  assert.deepEqual(diskRows([{ path: '/dev/mmcblk0' }], []), [])
  assert.deepEqual(readSelection({ getItem: () => '[]' }, 'key'), [])
  assert.equal(readSelection({ getItem: () => '[{}]' }, 'key'), null)
  assert.equal(readSelection({ getItem: () => '{' }, 'key'), null)
})
test('unknown readings never appear healthy and sleep preserves known health', () => {
  assert.equal(diskHealth({ health: 'false' }), 'damaged')
  assert.equal(diskHealth({ health: 'true', smart_state: 'unavailable' }), 'unknown')
  assert.equal(diskHealth({ health: 'true', smart_state: 'sleeping' }), 'unknown')
  assert.equal(diskHealth({ health: 'false', smart_state: 'sleeping', smart_sampled_at: 100 }), 'damaged')
  assert.equal(diskHealth({ health: 'true', smart_state: 'sleeping', smart_sampled_at: 100 }), 'healthy')
})
