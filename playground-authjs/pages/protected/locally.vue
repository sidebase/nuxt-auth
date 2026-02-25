<script setup lang="ts">
import { definePageMeta } from '#imports'

// Note: This is only for testing. The global middleware already protects all pages,
// so explicitly adding the named middleware here is redundant.
definePageMeta({
  middleware: 'zitadel-auth',
})
</script>

<template>
  <div>
    I'm a secret! My protection works via the named `nuxt-auth` module
    middleware.
  </div>
</template>
