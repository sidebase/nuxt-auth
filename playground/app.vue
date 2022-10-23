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
    <h3>
      Status:
    </h3>
    <pre>{{ status }}</pre>
    <h3>Data:</h3>
    <pre>
      {{ data }}
    </pre>
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

const { data, getSession, status, signIn, signOut, getCsrfToken, getProviders } = await useSession()

const providers = await getProviders()
const csrfToken = await getCsrfToken()
</script>
