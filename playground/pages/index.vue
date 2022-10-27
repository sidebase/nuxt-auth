<template>
  <div>
    <button @click="signIn">
      sign in with github
    </button>
    <button @click="signOut">
      sign out
    </button>
    <button @click="getSession()">
      refresh session
    </button>
  </div>
</template>

<script setup lang="ts">
import { useSession } from '#imports'

const { getSession, signIn, signOut } = await useSession({ required: false })
</script>
