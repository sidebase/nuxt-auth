<template>
  <div>I'm a secret! My protection works via an named middleware.</div>
</template>

<script setup lang="ts">
import { definePageMeta } from '#imports'

// Note: This is only for testing, it does not make sense to do this with `enableGlobalAuthMiddleware` turned on
definePageMeta({
  middleware: 'auth'
})
</script>
