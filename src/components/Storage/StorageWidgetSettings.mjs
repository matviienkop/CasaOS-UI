import { renderSize } from '../../mixins/file_utils.js'
import { SETTINGS_EVENT, listVolumes, readSettings, settingsKey } from '../../utils/storage-widget.mjs'

export default {
  name: 'StorageWidgetSettings',
  data() {
    const key = settingsKey(this.$store.state.user)
    const saved = readSettings(localStorage, key)
    return {
      key,
      saved,
      selected: saved ? saved.volumes.map(volume => volume.id) : [],
      mode: saved ? saved.mode : 'separate',
      volumes: [],
      loading: true,
      loadFailed: false,
      error: '',
    }
  },
  computed: {
    options() {
      const ids = new Set(this.volumes.map(volume => volume.id))
      const missing = this.saved ? this.saved.volumes.filter(volume => !ids.has(volume.id)).map(volume => ({ ...volume, missing: true })) : []
      return [...this.volumes, ...missing]
    },
  },
  async mounted() {
    try {
      const response = await this.$api.storage.list({ system: 'show' })
      this.volumes = listVolumes(response.data.data)
    }
    catch {
      this.loadFailed = true
      this.error = 'Unable to load storage information'
    }
    finally {
      this.loading = false
    }
  },
  methods: {
    renderSize,
    save() {
      const value = {
        mode: this.mode,
        volumes: this.options.filter(volume => this.selected.includes(volume.id)).map(({ id, name, mount }) => ({ id, name, mount })),
      }
      try {
        localStorage.setItem(this.key, JSON.stringify(value))
      }
      catch {
        this.error = 'Unable to save widget settings in this browser'
        return
      }
      this.saved = value
      this.error = ''
      window.dispatchEvent(new CustomEvent(SETTINGS_EVENT))
      this.$buefy.toast.open({ message: this.$t('Widget settings saved'), type: 'is-success' })
    },
    reset() {
      try {
        localStorage.removeItem(this.key)
      }
      catch {
        this.error = 'Unable to save widget settings in this browser'
        return
      }
      this.saved = null
      this.selected = []
      this.mode = 'separate'
      this.error = this.loadFailed ? 'Unable to load storage information' : ''
      window.dispatchEvent(new CustomEvent(SETTINGS_EVENT))
      this.$buefy.toast.open({ message: this.$t('Default widget behavior restored'), type: 'is-success' })
    },
  },
}
