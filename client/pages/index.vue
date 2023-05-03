<script setup lang="ts">
import { useDevtoolsClient } from '@nuxt/devtools-kit/iframe-client'

const client = useDevtoolsClient()
</script>

<template>
  <div class="relative p-10 n-bg-base flex flex-col h-screen">
    <h1 class="text-3xl font-bold">
      @sidebase/nuxt-auth
    </h1>
    <div class="opacity-50">
      Dashboard
    </div>
    <ExperimentalWarning class="mt-5 " />
    <div v-if="client" class="my-4 grid grid-cols-4 gap-4">
      <n-card class="p-3">
        <p class="font-bold">
          Selected provider:
        </p>
        {{ client.host.nuxt.$config.auth.provider.type }}
      </n-card>
      <n-card class="p-3">
        <p class="font-bold">
          Is global middleware enabled?
        </p>
        {{ client.host.nuxt.$config.auth.globalAppMiddleware.isEnabled }}
      </n-card>
      <n-card class="p-3">
        <p class="font-bold">
          Selected provider:
        </p>
        {{ client.host.nuxt.$config.auth.provider.type }}
      </n-card>
      <n-card class="p-3">
        <p class="font-bold">
          Selected provider:
        </p>
        {{ client.host.nuxt.$config.auth.provider.type }}
      </n-card>
    </div>
  </div>
</template>
