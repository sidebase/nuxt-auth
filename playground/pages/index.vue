<template>
  <div>
    <button @click="signIn({ callbackUrl: '/'})">
      sign in
    </button>
    <br>
    <button @click="signIn({ callbackUrl: '/protected/inline' })">
      sign in (with redirect to protected page)
    </button>
    <br>
    <button @click="signOut">
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
