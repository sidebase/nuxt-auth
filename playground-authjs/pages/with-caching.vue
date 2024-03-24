<script setup lang="ts">
import { definePageMeta, ref, useState } from '#imports'

const clientRenderTime = ref<Date>(new Date())

const serverRenderTime = useState('server-render-date', () => new Date())

definePageMeta({ auth: false })
</script>

<template>
  <div>
    <p>Server Render Time: {{ serverRenderTime?.toISOString() }}</p>
    <p>Client Render Time: {{ clientRenderTime?.toISOString() }}</p>
  </div>
</template>
