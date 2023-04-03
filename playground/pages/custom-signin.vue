<template>
  <div>
    <button @click="signIn('github')">
      Sign in with github
    </button>
    <br>
    <input v-model="username" type="text" placeholder="username (jsmith)">
    <input v-model="password" type="password" placeholder="password (hunter2)">
    <br>
    <button @click="signIn('credentials', { username, password, callbackUrl: '/protected/globally' })">
      Sign in with username and password
    </button>
    <br>
    <button @click="mySignInHandler({ username, password, callbackUrl: '/protected/globally' })">
      Sign in with username and password using a custom sign in handler
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { definePageMeta, useAuth, navigateTo } from '#imports'

definePageMeta({ auth: false })

const username = ref('')
const password = ref('')

const { signIn } = useAuth()

const mySignInHandler = async ({ username, password, callbackUrl }: { username: string, password: string, callbackUrl: string }) => {
  const { error, url } = await signIn('credentials', { username, password, callbackUrl, redirect: false })

  if (error) {
    // Do your custom error handling here
    alert('You have made a terrible mistake while entering your credentials')
  } else {
    // No error, continue with the sign in, e.g., by following the returned redirect:
    return navigateTo(url, { external: true })
  }
}
</script>
