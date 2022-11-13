<template>
  <div>I'm a secret! My protection works via an inline middleware.</div>
</template>

<script setup lang="ts">
import { useSession, definePageMeta } from '#imports'

definePageMeta({
  middleware: async () => {
    // process.client && await useSession({ callbackUrl: '/protected/inline' })
    process.server && await useSession({ callbackUrl: '/protected/inline' })
    // await useSession({ callbackUrl: '/protected/inline' })
  }
})
</script>
