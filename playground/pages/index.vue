<template>
  <div>
    <button @click="signIn(undefined, { callbackUrl: '/'})">
      sign in
    </button>
    <br>
    <button @click="signIn('credentials', { callbackUrl: '/'})">
      sign in (credential)
    </button>
    <br>
    <button @click="signIn('github', { callbackUrl: '/'})">
      sign in (github)
    </button>
    <br>
    <button @click="signIn(undefined, { callbackUrl: '/protected/inline' })">
      sign in (with redirect to protected page)
    </button>
    <br>
    <button @click="signOut({ callbackUrl: '/' })">
      sign out
    </button>
    <br>
    <button @click="getSession()">
      refresh session
    </button>
  </div>
</template>

<script setup lang="ts">
import { useSession } from '#imports'

const { getSession, signIn, signOut } = await useSession({ required: false })
</script>
