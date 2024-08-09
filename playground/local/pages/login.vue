<script lang="ts" setup>
import { ref } from 'vue'
import { definePageMeta, useAuth } from '#imports'

const { signIn, token, data, status, lastRefreshedAt } = useAuth()

const username = ref('')
const password = ref('')

definePageMeta({
  auth: {
    unauthenticatedOnly: true,
    navigateAuthenticatedTo: '/'
  }
})
</script>

<template>
  <div>
    <h1>Login Page</h1>
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
  </div>
</template>
