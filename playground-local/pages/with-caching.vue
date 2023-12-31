<script setup lang="ts">
import { computed, definePageMeta, onMounted, ref } from '#imports'

const cachedAt = ref(new Date())
const enteredAt = ref<Date | undefined>(undefined)

const cachedAtTime = computed(() => cachedAt.value.getTime())
const enteredAtTime = computed(() => (enteredAt.value?.getTime() ?? 0))

const relativeTimeFormat = ref(new Intl.RelativeTimeFormat('en'))

onMounted(() => {
  enteredAt.value = new Date()
})

definePageMeta({ auth: false })
</script>

<template>
  <div>
    <p v-if="cachedAtTime < enteredAtTime - 5000">
      This page was cached
      {{ relativeTimeFormat.format((cachedAtTime / 60000) - (enteredAtTime / 60000), 'minutes') }}.
    </p>
    <p v-else>
      This page was not cached.
    </p>
    <p>Cached At: {{ enteredAt?.toISOString() }}.</p>
    <p>Created At: {{ enteredAt?.toISOString() }}.</p>
  </div>
</template>
