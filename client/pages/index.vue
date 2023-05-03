<script setup lang="ts">
import { useDevtoolsClient } from '@nuxt/devtools-kit/iframe-client'

const client = useDevtoolsClient()
const { status, data } = client.value?.host.nuxt.vueApp.config.globalProperties?.$auth
</script>

<template>
  <div class="relative n-bg-base flex flex-col h-screen">
    <NSectionBlock
      icon="carbon:unlocked"
      text="Authentication"
      description="@sidebase/nuxt-auth"
      :padding="false"
    >
      <hr class="border-zinc-800">
      <div px4 pt6>
        <span op50>Read our documentation under </span><a href="https://sidebase.io/nuxt-auth" target="_blank" hover="text-primary underline">sidebase.io/nuxt-auth</a>
      </div>
    </NSectionBlock>
    <hr class="border-zinc-800">

    <div class="m-3">
      <NCard class="p-3">
        Status: {{ status }} <br>
        Username : {{ data ? data.username : 'unknown' }}
      </NCard>
    </div>
  </div>
</template>
