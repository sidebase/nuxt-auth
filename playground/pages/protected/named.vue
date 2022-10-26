<template>
  <div>I'm a secret! My protection works via an named middleware.</div>
</template>

<script setup lang="ts">
import { definePageMeta } from '#imports'

definePageMeta({
  middleware: ['auth']
})
</script>
