<script lang="ts" setup>
import { useAuth } from '#imports'

const { signIn, token, data, status, lastRefreshedAt } = useAuth()
</script>

<template>
  <div>
    <button @click="signIn({ username: 'bernd', password: 'hunter2' })">
      sign in
    </button>
    <pre>Status: {{ status }}</pre>
    <pre>Data: {{ data || 'no session data present, are you logged in?' }}</pre>
    <pre>Last refreshed at: {{ lastRefreshedAt || 'no refresh happened' }}</pre>
    <pre>JWT token: {{ token || 'no token present, are you logged in?' }}</pre>
  </div>
</template>
