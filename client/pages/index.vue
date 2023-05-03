<script setup lang="ts">
import { useDevtoolsClient } from '@nuxt/devtools-kit/iframe-client'

const client = useDevtoolsClient()
</script>

<template>
  <div class="relative p-10 n-bg-base flex flex-col h-screen">
    <h1 class="text-3xl font-bold">
      @sidebase/nuxt-auth
    </h1>
    <div class="opacity-50 mb-4">
      Dashboard
    </div>

    <div class="flex-auto" />
    <ModuleAuthorNote class="mt-5 " />
  </div>
</template>
