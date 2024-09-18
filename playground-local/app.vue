<script lang="ts" setup>
import { ref } from 'vue'
import { useAuth } from '#imports'

const { signIn, token, refreshToken, data, status, lastRefreshedAt, signOut, getSession } = useAuth()

const username = ref('smith')
const password = ref('hunter2')
</script>

<template>
  <div>
    <pre>Status: <span data-testid="status">{{ status }}</span></pre>
    <pre>Data: {{ data || 'no session data present, are you logged in?' }}</pre>
    <pre>Last refreshed at: {{ lastRefreshedAt || 'no refresh happened' }}</pre>
    <pre>JWT token: {{ token || 'no token present, are you logged in?' }}</pre>
    <pre>Refresh token: {{ refreshToken || 'N/A' }}</pre>

    <form @submit.prevent="signIn({ username, password })">
      <input v-model="username" type="text" placeholder="Username" data-testid="username">
      <input v-model="password" type="password" placeholder="Password" data-testid="password">
      <button type="submit" data-testid="submit">
        sign in
      </button>
    </form>

    <br>
    <button @click="signIn({ username, password }, { callbackUrl: '/protected/globally' })">
      sign in (with redirect to protected page)
    </button>
    <br>
    <button data-testid="signout" @click="signOut({ callbackUrl: '/signout' })">
      sign out
    </button>
    <br>
    <button data-testid="refresh-required-false" @click="getSession({ required: false })">
      refresh session (required: false)
    </button>
    <br>
    <button data-testid="refresh-required-true" @click="getSession({ required: true, callbackUrl: '/' })">
      refresh session (required: true)
    </button>
    <br>
    <NuxtLink to="/login">
      navigate to Login Page
    </NuxtLink>
    <NuxtPage />
  </div>
</template>
