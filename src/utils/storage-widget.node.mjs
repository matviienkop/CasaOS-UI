import test from 'node:test'
import assert from 'node:assert/strict'
import settingsDefinition from '../components/Storage/StorageWidgetSettings.mjs'
import volumesDefinition from '../components/Storage/StorageWidgetVolumes.mjs'
import * as helpers from './storage-widget.mjs'

const { readSettings, settingsKey, listVolumes, selectedVolumes, totalUsage, usagePercent } = helpers
const rawVolume = { uuid: 'raid-uuid', label: 'storage', mount_point: '/mnt/storage', size: '2000', used: '100', avail: '1800' }
const rawStorage = { type: 'raid10', children: [rawVolume] }
const raid = listVolumes([rawStorage])[0]
const settings = { mode: 'separate', volumes: [{ id: raid.id, name: raid.name, mount: raid.mount }] }

test('missing, corrupt, invalid and inaccessible preferences retain legacy behavior', () => {
  for (const value of [null, '{', '[]', '{}', '{"mode":"total","volumes":[]}', '{"mode":"bad","volumes":[{}]}']) {
    assert.equal(readSettings({ getItem: () => value }, 'key'), null)
  }
  assert.equal(readSettings({ getItem() {
    throw new Error('blocked')
  } }, 'key'), null)
})

test('preferences round-trip and are scoped by user', () => {
  assert.deepEqual(readSettings({ getItem: () => JSON.stringify(settings) }, 'key'), settings)
  assert.notEqual(settingsKey({ id: 1 }), settingsKey({ id: 2 }))
})

test('RAID and multiple mount points count once; system volumes remain selectable', () => {
  const volumes = listVolumes([rawStorage, rawStorage, { children: [
    { ...rawVolume, mount_point: '/other' },
    { uuid: 'root', mount_point: '/', size: '128', used: '10', avail: '110' },
    { mount_point: '[SWAP]' },
    { mount_point: '' },
  ] }])
  assert.equal(volumes.length, 2)
  assert.equal(volumes[1].mount, '/')
  assert.deepEqual(totalUsage(volumes), { size: 2128, used: 110, avail: 1910 })
})

test('UUID selection survives device renumbering, rename and mount relocation', () => {
  const volumes = listVolumes([{ children: [{ ...rawVolume, path: '/dev/md126', label: 'renamed', mount_point: '/new' }] }])
  assert.equal(selectedVolumes(settings, volumes)[0].mount, '/new')
})

test('missing selections never fall back to another disk or stale statistics', () => {
  const missing = selectedVolumes(settings, [])
  assert.equal(missing[0].missing, true)
  assert.equal(missing[0].size, undefined)
  assert.deepEqual(totalUsage(missing), { size: 0, used: 0, avail: 0 })
})

test('UUID-less volumes use their mount point, not unstable device names', () => {
  assert.equal(listVolumes([{ children: [{ mount_point: '/data', path: '/dev/sde1' }] }])[0].id, 'mount:/data')
})

test('usage percentage handles empty and out-of-range values', () => {
  assert.equal(usagePercent({ size: 0, avail: 0 }), 0)
  assert.equal(usagePercent({ size: 100, avail: 25 }), 75)
  assert.equal(usagePercent({ size: 100, avail: 150 }), 0)
  assert.equal(usagePercent({ size: 100, avail: -10 }), 100)
})

function settingsPanel(t, storage) {
  const emitted = []
  const globals = {
    localStorage: storage,
    window: { dispatchEvent: event => emitted.push(event) },
    CustomEvent: class { constructor(type) { this.type = type } },
  }
  for (const [key, value] of Object.entries(globals)) {
    const descriptor = Object.getOwnPropertyDescriptor(globalThis, key)
    Object.defineProperty(globalThis, key, { configurable: true, value })
    t.after(() => {
      if (descriptor)
        Object.defineProperty(globalThis, key, descriptor)
      else
        delete globalThis[key]
    })
  }
  const definition = settingsDefinition
  const panel = { $store: { state: { user: { id: 1 } } }, $t: text => text, $buefy: { toast: { open() {} } } }
  Object.assign(panel, definition.data.call(panel))
  Object.entries(definition.methods).forEach(([key, method]) => {
    panel[key] = method.bind(panel)
  })
  Object.defineProperty(panel, 'options', { get: () => definition.computed.options.call(panel) })
  return { panel, emitted }
}

test('editing does not persist; save applies preferences; reset removes them', (t) => {
  const values = new Map()
  const { panel, emitted } = settingsPanel(t, { getItem: key => values.get(key), setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) })
  panel.volumes = [raid]
  panel.selected = [raid.id]
  assert.equal(values.size, 0)
  panel.save()
  assert.equal(JSON.parse(values.get(panel.key)).volumes[0].id, raid.id)
  assert.equal(emitted.length, 1)
  panel.reset()
  assert.equal(values.size, 0)
  assert.equal(panel.saved, null)
  assert.equal(emitted.length, 2)
})

test('storage write failure does not apply an unsaved selection', (t) => {
  const { panel, emitted } = settingsPanel(t, { getItem: () => null, setItem() {
    throw new Error('quota')
  } })
  panel.volumes = [raid]
  panel.selected = [raid.id]
  panel.save()
  assert.equal(panel.saved, null)
  assert.equal(emitted.length, 0)
  assert.equal(panel.error, 'Unable to save widget settings in this browser')
})

test('aggregate mode with a missing volume does not claim partial totals are complete', () => {
  const definition = volumesDefinition
  const missing = selectedVolumes(settings, [])
  const rows = definition.computed.rows.call({ settings: { mode: 'total' }, missing, selected: [raid, ...missing] })
  assert.equal(rows, missing)
})

test('custom widget distinguishes API errors from missing disks and recovers', async () => {
  const definition = volumesDefinition
  const state = { ...definition.data(), $api: { storage: { list: async () => {
    throw new Error('network')
  } } } }
  await definition.methods.refresh.call(state)
  assert.equal(state.error, true)
  assert.equal(state.loading, false)
  state.$api.storage.list = async () => ({ data: { data: [rawStorage] } })
  await definition.methods.refresh.call(state)
  assert.equal(state.error, false)
  assert.equal(state.volumes[0].id, raid.id)
})

test('unmounted custom widget ignores late requests', async () => {
  const definition = volumesDefinition
  const state = { ...definition.data(), $api: { storage: { list: async () => {
    state.disposed = true
    return { data: { data: [rawStorage] } }
  } } } }
  await definition.methods.refresh.call(state)
  assert.equal(state.volumes.length, 0)
})

test('volume formatting and progress colors preserve display boundaries', () => {
  assert.equal(settingsDefinition.methods.renderSize(2048), '2 KB')
  assert.equal(volumesDefinition.methods.renderSize(0), '0 Bytes')
  for (const [percent, color] of [[0, 'is-primary'], [79, 'is-primary'], [80, 'is-warning'], [89, 'is-warning'], [90, 'is-danger'], [100, 'is-danger']]) {
    assert.equal(volumesDefinition.methods.progressType(percent), color)
  }
})
