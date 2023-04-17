<script lang="ts" setup>
import { ref } from 'vue'
import { useAuth } from '#imports'

const { signIn, token, data, status, lastRefreshedAt, signOut, getSession } = useAuth()

const username = ref('')
const password = ref('')
</script>

<template>
  <div>
    <pre>Status: {{ status }}</pre>
    <pre>Data: {{ data || 'no session data present, are you logged in?' }}</pre>
    <pre>Last refreshed at: {{ lastRefreshedAt || 'no refresh happened' }}</pre>
    <pre>JWT token: {{ token || 'no token present, are you logged in?' }}</pre>
    <form @submit.prevent="signIn({ username, password })">
      <input v-model="username" type="text" placeholder="Username">
      <input v-model="password" type="password" placeholder="Password">
      <button type="submit">
        sign in
      </button>
    </form>
    <br>
    <button @click="signIn({ username, password }, { callbackUrl: '/protected/globally' })">
      sign in (with redirect to protected page)
    </button>
    <br>
    <button @click="signOut({ callbackUrl: '/signout' })">
      sign out
    </button>
    <br>
    <button @click="getSession({ required: false })">
      refresh session (required: false)
    </button>
    <br>
    <button @click="getSession({ required: true, callbackUrl: '/' })">
      refresh session (required: true)
    </button>
    <NuxtPage />
  </div>
</template>
