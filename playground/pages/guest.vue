<script setup lang="ts">
import { definePageMeta } from '#imports'

definePageMeta({
  auth: {
    unauthenticatedOnly: false,
    navigateAuthenticatedTo: '/protected/globally'
  }
})
</script>

<template>
  <div>
    <p>Hey!</p>
  </div>
</template>
