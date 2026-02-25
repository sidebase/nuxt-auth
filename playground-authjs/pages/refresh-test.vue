<script setup lang="ts">
import { ref, watch } from 'vue'
import { definePageMeta, useAuth } from '#imports'

definePageMeta({ auth: false })

const { status, lastRefreshedAt } = useAuth()

const refreshCount = ref(0)

watch(lastRefreshedAt, () => {
  refreshCount.value++
})
</script>

<template>
  <div>
    <h1>refresh-test</h1>
    <pre data-testid="status">{{ status }}</pre>
    <pre data-testid="last-refreshed-at">{{ lastRefreshedAt ?? 'never' }}</pre>
    <pre data-testid="refresh-count">{{ refreshCount }}</pre>
  </div>
</template>
