export function diskId(disk) {
  return disk.serial ? `serial:${disk.serial}` : `path:${disk.path || disk.name}`
}

export function readSelection(storage, key) {
  try {
    const value = JSON.parse(storage.getItem(key))
    return Array.isArray(value) && value.every(disk => typeof disk.id === 'string' && typeof disk.name === 'string') ? value : null
  }
  catch {
    return null
  }
}

export function diskRows(disks, selection) {
  const current = new Map(disks.map(disk => [diskId(disk), { ...disk, id: diskId(disk) }]))
  return selection === null ? [...current.values()] : selection.map(disk => current.get(disk.id) || { ...disk, missing: true })
}

export function diskHealth(disk) {
  if (disk.missing || disk.smart_state === 'unavailable' || (disk.smart_state === 'sleeping' && !disk.smart_sampled_at))
    return 'unknown'
  if (disk.health === 'true') return 'healthy'
  if (disk.health === 'false') return 'damaged'
  return 'unknown'
}
