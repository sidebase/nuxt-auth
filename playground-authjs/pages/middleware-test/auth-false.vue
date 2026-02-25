<!--
  Page with `auth: false`.

  This explicitly opts out of authentication protection. The page is
  publicly accessible even though the global middleware is enabled.
  Both authenticated and unauthenticated users can access it.
-->
<script setup lang="ts">
import { definePageMeta } from '#imports'

definePageMeta({ auth: false })
</script>

<template>
  <h1>auth-false</h1>
</template>
