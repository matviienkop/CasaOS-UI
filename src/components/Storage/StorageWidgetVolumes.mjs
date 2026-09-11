import { renderSize } from '../../mixins/file_utils.js'
import { listVolumes, selectedVolumes, totalUsage, usagePercent } from '../../utils/storage-widget.mjs'

export default {
  name: 'StorageWidgetVolumes',
  props: { settings: { type: Object, required: true } },
  data() {
    return { volumes: [], loading: true, error: false, refreshing: false, timer: null, disposed: false }
  },
  computed: {
    selected() { return selectedVolumes(this.settings, this.volumes) },
    missing() { return this.selected.filter(volume => volume.missing) },
    rows() {
      if (this.settings.mode === 'separate')
        return this.selected
      if (this.missing.length)
        return this.missing
      return [{ id: 'total', name: this.$t('Total of selected volumes'), ...totalUsage(this.selected) }]
    },
  },
  mounted() {
    this.refresh()
    this.timer = window.setInterval(this.refresh, 30000)
  },
  beforeDestroy() {
    this.disposed = true
    window.clearInterval(this.timer)
  },
  methods: {
    progressType(percent) {
      if (percent < 80)
        return 'is-primary'
      if (percent < 90)
        return 'is-warning'
      return 'is-danger'
    },
    renderSize,
    usagePercent,
    async refresh() {
      if (this.refreshing)
        return
      this.refreshing = true
      try {
        const response = await this.$api.storage.list({ system: 'show' })
        if (this.disposed)
          return
        this.volumes = listVolumes(response.data.data)
        this.error = false
      }
      catch {
        if (!this.disposed)
          this.error = true
      }
      finally {
        if (!this.disposed) {
          this.loading = false
          this.refreshing = false
        }
      }
    },
  },
}
