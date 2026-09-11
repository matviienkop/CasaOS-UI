<script src="./StorageWidgetVolumes.mjs" />

<template>
  <div class="widget has-text-white disk is-relative">
    <div class="blur-background" />
    <div class="widget-content">
      <div class="widget-header is-flex">
        <div class="widget-title is-flex-grow-1">
          {{ $t('Storage') }}
        </div>
        <div class="widget-icon-button is-flex-shrink-0" @click="$emit('manage')">
          <b-icon icon="settings-outline" pack="casa" size="is-20" />
        </div>
      </div>
      <p v-if="loading" class="mt-3">
        {{ $t('Loading storage information') }}
      </p>
      <p v-else-if="error" class="mt-3">
        {{ $t('Unable to load storage information') }}
      </p>
      <template v-else>
        <div v-for="volume in rows" :key="volume.id" class="pt-3">
          <div class="is-flex is-align-items-center">
            <b-image :src="require('@/assets/img/storage/storage.svg')" class="is-48x48 is-flex-shrink-0" />
            <div class="ml-2 is-flex-grow-1 storage-volume-text">
              <h4 class="has-text-white is-size-6">
                {{ volume.name }}
              </h4>
              <p v-if="volume.missing" class="has-text-warning">
                {{ $t('Unavailable') }}
              </p>
              <p v-else class="is-size-14px">
                {{ $t('Used') }}: {{ renderSize(volume.used) }}<br>
                {{ $t('Total') }}: {{ renderSize(volume.size) }}
              </p>
            </div>
          </div>
          <b-progress v-if="!volume.missing" :type="progressType(usagePercent(volume))" :value="usagePercent(volume)" class="mt-2" size="is-small" />
        </div>
        <p v-if="settings.mode === 'total' && missing.length" class="mt-3 has-text-warning">
          {{ $t('Some selected volumes are unavailable. Total usage cannot be shown.') }}
        </p>
      </template>
    </div>
  </div>
</template>

<style scoped>
.storage-volume-text { min-width: 0; overflow-wrap: anywhere; }
</style>
