<template>
  <div class="widget has-text-white disk-health is-relative">
    <div class="blur-background"></div>
    <div class="widget-content">
      <div class="widget-header is-flex is-align-items-center">
        <div class="widget-title is-flex-grow-1">{{ $t('Physical disks') }}</div>
        <button class="widget-icon-button disk-health-button" :aria-label="$t('Configure disks')" :aria-expanded="editing" @click="configure">
          <b-icon icon="settings-outline" pack="casa" size="is-20" />
        </button>
      </div>
      <p v-if="error" role="status" class="is-size-7 mt-3">{{ $t('Disk information unavailable') }}</p>
      <template v-if="editing">
        <p class="is-size-7 mt-3 mb-3">{{ $t('Disk selection is saved for this user in this browser.') }}</p>
        <div v-for="disk in options" :key="disk.id" class="mb-3">
          <b-checkbox v-model="draft" :native-value="disk.id">
            {{ disk.name }} <span v-if="disk.missing">— {{ $t('Disk disconnected') }}</span>
            <span v-else class="is-size-7">— {{ disk.model }}</span>
          </b-checkbox>
        </div>
        <p v-if="saveError" role="alert" class="is-size-7">{{ $t('Could not save disk selection') }}</p>
        <div class="buttons mt-3">
          <b-button size="is-small" type="is-primary" :disabled="loading || error" @click="save">{{ $t('Save') }}</b-button>
          <b-button size="is-small" @click="editing = false">{{ $t('Cancel') }}</b-button>
        </div>
      </template>
      <template v-else>
        <p v-if="loading" class="is-size-7 mt-3">{{ $t('Loading disk information') }}</p>
        <p v-else-if="!rows.length && !error" class="is-size-7 mt-3">{{ $t('No disks selected') }}</p>
        <div v-for="disk in rows" :key="disk.id" class="disk-health-row mt-3 pt-3">
          <div class="is-flex is-justify-content-space-between is-align-items-center">
            <strong class="has-text-white">{{ disk.name }}</strong>
            <strong class="has-text-white">{{ !error && !disk.missing && disk.temperature > 0 ? disk.temperature + '°C' : 'N/A' }}</strong>
          </div>
          <p v-if="disk.model" class="is-size-7 disk-health-model">{{ disk.model }}</p>
          <p class="is-size-7" :class="healthClass(disk)">{{ healthLabel(disk) }}</p>
          <p v-if="!error && !disk.missing && disk.smart_state === 'sleeping'" class="is-size-7">{{ $t('Disk sleeping') }}</p>
          <p v-if="disk.smart_sampled_at" class="is-size-7 disk-health-time">{{ $t('SMART last measured') }}: {{ measuredAt(disk) }}</p>
        </div>
      </template>
    </div>
  </div>
</template>

<script>
import { diskId, diskRows, diskHealth, readSelection } from '@/utils/disk-health.mjs'

export default {
  name: 'disk-health',
  icon: 'storage-outline',
  title: 'Physical disks',
  initShow: true,
  data() {
    return { disks: [], selection: null, draft: [], editing: false, loading: true, error: false, saveError: false, pending: false, disposed: false, timer: null }
  },
  computed: {
    selectionKey() { return `casaos.disk-health.v1:${this.$store.state.user.id || this.$store.state.user.username}` },
    rows() { return diskRows(this.disks, this.selection) },
    options() {
      const options = diskRows(this.disks, null)
      return options.concat(this.rows.filter(disk => disk.missing))
    },
  },
  watch: {
    selectionKey() { this.loadSelection() },
  },
  mounted() {
    this.loadSelection()
    this.refresh()
    this.timer = window.setInterval(() => { if (!document.hidden) this.refresh() }, 60000)
    window.addEventListener('storage', this.onStorage)
    document.addEventListener('visibilitychange', this.onVisibility)
  },
  beforeDestroy() {
    this.disposed = true
    window.clearInterval(this.timer)
    window.removeEventListener('storage', this.onStorage)
    document.removeEventListener('visibilitychange', this.onVisibility)
  },
  methods: {
    loadSelection() {
      this.selection = readSelection(localStorage, this.selectionKey)
      this.editing = false
    },
    onStorage(event) { if (event.key === null || event.key === this.selectionKey) this.loadSelection() },
    onVisibility() { if (!document.hidden) this.refresh() },
    configure() {
      this.draft = this.rows.map(disk => disk.id)
      this.saveError = false
      this.editing = !this.editing
    },
    save() {
      const selection = this.options.filter(disk => this.draft.includes(disk.id)).map(disk => ({ id: disk.id, name: disk.name }))
      try {
        localStorage.setItem(this.selectionKey, JSON.stringify(selection))
        this.selection = selection
        this.editing = false
      }
      catch { this.saveError = true }
    },
    async refresh() {
      if (this.pending || this.disposed) return
      this.pending = true
      try {
        const response = await this.$api.disks.getDiskList()
        if (!this.disposed) {
          const disks = [...response.data.data.disks, ...(response.data.data.avail || [])]
          this.disks = [...new Map(disks.map(disk => [diskId(disk), disk])).values()]
          this.error = false
        }
      }
      catch { if (!this.disposed) this.error = true }
      finally { this.pending = false; if (!this.disposed) this.loading = false }
    },
    healthClass(disk) {
      if (this.error) return ''
      return { healthy: 'has-text-success', damaged: 'has-text-danger', unknown: '' }[diskHealth(disk)]
    },
    healthLabel(disk) {
      if (this.error) return 'N/A'
      if (disk.missing) return this.$t('Disk disconnected')
      const health = diskHealth(disk)
      return health === 'unknown' ? this.$t('SMART data unavailable') : this.$t(health === 'healthy' ? 'Healthy' : 'Damage')
    },
    measuredAt(disk) { return new Date(disk.smart_sampled_at * 1000).toLocaleString(this.$i18n.locale.replace('_', '-')) },
  },
}
</script>

<style scoped>
.disk-health-button { background: transparent; border: 0; color: inherit; cursor: pointer; padding: 0; }
.disk-health-row { border-top: 1px solid rgba(255, 255, 255, 0.15); }
.disk-health-model { overflow-wrap: anywhere; opacity: 0.8; }
.disk-health-time { opacity: 0.7; }
</style>
