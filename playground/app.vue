<template>
  <div>
    <h3>Session:</h3>
    <pre>
      {{ session }}
    </pre>
    <button @click="signIn">
      sign in with github
    </button>
    <button @click="signOut">
      sign out
    </button>
    <h3>CSRF Token</h3>
    <pre>
      {{ csrfToken }}
    </pre>
    <h3>Providers</h3>
    <pre>
      {{ providers }}
    </pre>
  </div>
</template>

<script setup lang="ts">
import useSession from './composables/useSession'

const { session, signIn, signOut, getCsrfToken, getProviders } = await useSession()

const providers = await getProviders()
const csrfToken = await getCsrfToken()
</script>
