<script lang="ts" setup>
withDefaults(defineProps<{
  position?: 'left' | 'right'
  width?: string
}>(), { position: 'left', width: '200px' })
</script>

<template>
  <div
    class="fixed top-14 w-full space-y-4 z-0"
    :class="{ 'left-0': position ==='left', 'right-0': position ==='right' }"
    :style="{ maxWidth: width }"
  >
    <div v-if="$slots.actions" class="flex flex-col bg-gray-100 border border-l-0 px-3 py-5 rounded-r">
      <h1 class="text-lg font-semibold mb-2">
        Actions:
      </h1>
      <slot name="actions" />
    </div>
    <div v-if="$slots.links" class="flex flex-col bg-gray-100 border border-l-0 px-3 py-5 rounded-r">
      <h1 class="text-lg font-semibold mb-2">
        Links:
      </h1>
      <slot name="links" />
    </div>

    <div v-if="$slots.default" class="flex flex-col bg-gray-100 border border-l-0 px-3 py-5 rounded-r">
      <slot />
    </div>
  </div>
</template>
