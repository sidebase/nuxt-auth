<script lang="ts" setup>
type Actions = 'reset' | 'fill'
defineProps<{
  title?: string
  actions?: Actions[]
}>()
defineEmits(['reset', 'fill'])
</script>

<template>
  <div class="bg-black rounded shadow text-white overflow-hidden">
    <header v-if="title" class="flex items-start justify-between w-full bg-gray-800 p-3">
      <h1 class="text-base font-medium">
        {{ title }}
      </h1>
      <div v-if="actions && actions.length > 0" class="flex items-center gap-1.5">
        <TheButton v-if="actions.includes('reset')" size="xs" @click="$emit('reset')">
          Reset
        </TheButton>
        <TheButton v-if="actions.includes('fill')" size="xs" @click="$emit('fill')">
          Autofill
        </TheButton>
      </div>
    </header>
    <pre><ClientOnly><slot /></ClientOnly></pre>
  </div>
</template>

<style>
pre {
  @apply my-0 p-3 rounded shadow overflow-x-auto min-h-12;
}

pre span {
  @apply text-green-300;
}
</style>
