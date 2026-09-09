<script>
import { mixin } from '@/mixins/mixin'
import { SETTINGS_EVENT, listVolumes, readSettings, settingsKey } from '@/utils/storage-widget.mjs'

export default {
  name: 'StorageWidgetSettings',
  mixins: [mixin],
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
</script>

<template>
  <div class="storage-widget-settings">
    <p class="mb-4">
      {{ $t('Storage widget preferences are saved for this user in this browser. Without saved preferences, the widget keeps its default behavior.') }}
    </p>
    <b-notification v-if="error" type="is-danger" :closable="false">
      {{ $t(error) }}
    </b-notification>
    <b-loading :active="loading" :is-full-page="false" />
    <b-field :label="$t('Displayed volumes')">
      <div class="volume-options">
        <div v-for="volume in options" :key="volume.id" class="mb-3">
          <b-checkbox v-model="selected" :native-value="volume.id">
            <strong>{{ volume.name }}</strong>
            <span v-if="volume.missing"> — {{ $t('Unavailable') }}</span>
            <span v-else> — {{ renderSize(volume.size) }}</span>
            <div class="is-size-7 has-text-grey">
              {{ volume.mount }}<span v-if="volume.type"> · {{ volume.type }}</span>
            </div>
          </b-checkbox>
        </div>
        <p v-if="!loading && !options.length">
          {{ $t('No mounted volumes found') }}
        </p>
      </div>
    </b-field>
    <b-field :label="$t('Display mode')">
      <div>
        <div class="mb-2">
          <b-radio v-model="mode" native-value="separate">
            {{ $t('Each volume separately') }}
          </b-radio>
        </div>
        <div>
          <b-radio v-model="mode" native-value="total">
            {{ $t('Total of selected volumes') }}
          </b-radio>
        </div>
      </div>
    </b-field>
    <div class="buttons mt-5">
      <b-button rounded :disabled="!saved" @click="reset">
        {{ $t('Reset widget settings') }}
      </b-button>
      <b-button rounded type="is-primary" :disabled="loading || loadFailed || !selected.length" @click="save">
        {{ $t('Save') }}
      </b-button>
    </div>
  </div>
</template>

<style scoped>
.storage-widget-settings { padding: 8px 4px 20px; }
.volume-options { width: 100%; overflow-wrap: anywhere; }
</style>
