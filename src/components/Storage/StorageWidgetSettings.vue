<script src="./StorageWidgetSettings.mjs" />

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
