<template>
  <div>
    I'm a secret! My protection works via the named `nuxt-auth` module
    middleware.
  </div>
</template>

<script setup lang="ts">
import { definePageMeta } from '#imports'
// Note: This is only for testing, it does not make sense to do this with `globalAppMiddleware` turned on
definePageMeta({
  middleware: 'auth'
})
</script>
