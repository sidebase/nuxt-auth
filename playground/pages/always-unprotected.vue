<template>
  <div>I'm always public, even when a global middleware is added!</div>
</template>

<script setup lang="ts">
import { definePageMeta } from '#imports'

definePageMeta({
  auth: false
})
</script>
