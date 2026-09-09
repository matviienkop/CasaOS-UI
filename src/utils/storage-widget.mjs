export const SETTINGS_EVENT = 'casaos:storage-widget-settings'

export function settingsKey(user) {
  return `casaos.storage-widget.v1:${user.id || user.username}`
}

export function readSettings(storage, key) {
  try {
    const value = JSON.parse(storage.getItem(key))
    if (!value || !['separate', 'total'].includes(value.mode) || !Array.isArray(value.volumes) || !value.volumes.length)
      return null
    if (!value.volumes.every(volume => typeof volume.id === 'string' && typeof volume.name === 'string' && typeof volume.mount === 'string'))
      return null
    return value
  }
  catch {
    return null
  }
}

export function listVolumes(storages) {
  const volumes = new Map()
  for (const storage of storages) {
    for (const volume of storage.children || []) {
      if (!volume.mount_point || volume.mount_point === '[SWAP]')
        continue
      const id = volume.uuid ? `uuid:${volume.uuid}` : `mount:${volume.mount_point}`
      if (volumes.has(id))
        continue
      volumes.set(id, {
        id,
        name: volume.label || volume.mount_point,
        mount: volume.mount_point,
        type: storage.type || volume.type,
        size: Number(volume.size) || 0,
        used: Number(volume.used) || 0,
        avail: Number(volume.avail) || 0,
      })
    }
  }
  return [...volumes.values()]
}

export function selectedVolumes(settings, volumes) {
  const current = new Map(volumes.map(volume => [volume.id, volume]))
  return settings.volumes.map(volume => current.get(volume.id) || { ...volume, missing: true })
}

export function totalUsage(volumes) {
  return volumes.filter(volume => !volume.missing).reduce((total, volume) => ({
    size: total.size + volume.size,
    used: total.used + volume.used,
    avail: total.avail + volume.avail,
  }), { size: 0, used: 0, avail: 0 })
}

export function usagePercent(volume) {
  return volume.size > 0 ? Math.min(100, Math.max(0, 100 - Math.floor(volume.avail * 100 / volume.size))) : 0
}
