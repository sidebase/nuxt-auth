<script setup lang="ts">
import { definePageMeta } from '#imports'
definePageMeta({
  auth: {
    unauthenticatedOnly: true,
    navigateAuthenticatedTo: '/protected/globally'
  }
})
</script>

<template>
  <div>
    <p>Hey!</p>
  </div>
</template>
