<template>
  <div>I'm a secret! My protection works via an inline middleware.</div>
</template>

<script setup lang="ts">
import { useSession, definePageMeta } from '#imports'

definePageMeta({
  middleware: async () => {
    await useSession()
  }
})
</script>
