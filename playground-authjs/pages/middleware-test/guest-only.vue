<!--
  Page with `auth: { unauthenticatedOnly: true, navigateAuthenticatedTo: '/' }`.

  This is a guest-only page. Only unauthenticated users can access it.
  Authenticated users are redirected to `/`. This pattern is used for
  pages like login or registration forms that should not be shown to
  users who are already signed in.
-->
<script setup lang="ts">
import { definePageMeta } from '#imports'

definePageMeta({
  auth: {
    unauthenticatedOnly: true,
    navigateAuthenticatedTo: '/',
  },
})
</script>

<template>
  <h1>guest-only</h1>
</template>
