<script setup lang="ts">
import { useAuth } from '#imports'

const { data, status, signIn, signOut, getSession } = useAuth()
</script>

<template>
  <div>
    <h1>Sample App</h1>
    <pre>Status: {{ status }}</pre>
    <pre>Session: {{ data || 'not authenticated' }}</pre>
    <div>
      <button @click="signIn('mock-oidc')">Sign in with OIDC</button>
      <button @click="signOut()">Sign out</button>
      <button @click="getSession({ required: false })">Refresh session</button>
    </div>
    <NuxtPage />
  </div>
</template>
