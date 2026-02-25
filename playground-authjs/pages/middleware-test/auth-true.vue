<!--
  Page with `auth: true`.

  This explicitly requires authentication. The global middleware protects
  this page. Unauthenticated users are redirected to the sign-in page
  and authenticated users are granted access.
-->
<script setup lang="ts">
import { definePageMeta } from '#imports'

definePageMeta({ auth: true })
</script>

<template>
  <h1>auth-true</h1>
</template>
