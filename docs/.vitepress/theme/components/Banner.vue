<script lang="ts" setup>
import { VPButton } from 'vitepress/theme'

defineProps<{
  text?: string
  button?: {
    href: string
    text: string
  }
}>()
</script>

<template>
  <div v-if="text" class="Banner">
    {{ text }}
    <VPButton
      v-if="button"
      class="small"
      theme="brand"
      :text="button.text"
      :href="button.href"
    />
  </div>
</template>

<style scoped>
.VPButton.small {
  border-radius: 10px;
  padding: 0 10px;
  line-height: 26px;
}

.Banner {
  display: flex;
  align-items: center;
  gap: 10px;
  justify-content: center;
  padding: 12px;

  background-color: #F6F6F7;
}

.dark .Banner {
  background-color: #202127;
}

@media only screen and (max-width: 800px) {
  .Banner {
    display: none;
  }
}
</style>
