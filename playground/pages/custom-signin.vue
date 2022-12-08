<template>
  <div>
    <button @click="signIn('github')">
      Sign in with github
    </button>
    <br>
    <input v-model="username" type="text" placeholder="username (jsmith)">
    <input v-model="password" type="password" placeholder="password (hunter2)">
    <button @click="signIn('credentials', { username, password, callbackUrl: '/protected/globally' })">
      Sign in with username and password
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { definePageMeta, useSession } from '~~/.nuxt/imports'

definePageMeta({ auth: false })

const username = ref('')
const password = ref('')

const { signIn } = useSession()
</script>
