<script lang="ts" setup>
import { useAuth } from '#imports'

const { signIn, token, data } = useAuth()
</script>

<template>
  <div>
    <button @click="signIn({ username: 'bernd', password: 'hunter2' })">
      sign in {{ token }} {{ data }}
    </button>
    <NuxtWelcome />
  </div>
</template>
