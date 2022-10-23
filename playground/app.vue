<template>
  <div>
    Nuxt module playground!
    <p>Providers:</p>
    <pre>
      {{ providers }}
    </pre>
    <p>Session:</p>
    <pre>
      {{ session }}
    </pre>
    <button @click="signIn">
      sign in with github
    </button>
  </div>
</template>

<script setup lang="ts">
import { useNuxtSession } from '#imports'
await useNuxtSession()

// const { data: providers } = await useFetch('/api/auth/providers')
// const signIn = async () => {
//   console.log('triggering sign in')
//   const r = await useFetch('/api/auth/signin/github')
//   console.log('r', r)
//   return navigateTo('http://localhost:3000/api/auth/signin/github', { external: true })
// }

</script>
