<!--
  Page with `auth: { unauthenticatedOnly: false }`.

  This is the object form of protection, equivalent in behavior to
  `auth: true`. Unauthenticated users are redirected to the sign-in page
  and authenticated users are granted access. The explicit
  `unauthenticatedOnly: false` confirms this is not a guest-only page.
-->
<script setup lang="ts">
import { definePageMeta } from '#imports'

definePageMeta({ auth: { unauthenticatedOnly: false } })
</script>

<template>
  <h1>protected</h1>
</template>
