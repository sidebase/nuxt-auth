<script setup>
import { ref } from 'vue'
import { definePageMeta, useAuth } from '#imports'

const { signUp } = useAuth()

const username = ref('')
const password = ref('')
const response = ref()

async function register() {
  try {
    const signUpResponse = await signUp({ username: username.value, password: password.value }, undefined, { preventLoginFlow: true })
    response.value = signUpResponse
  }
  catch (error) {
    response.value = { error: 'Failed to sign up' }
    console.error(error)
  }
}

definePageMeta({
  auth: {
    unauthenticatedOnly: true,
    navigateAuthenticatedTo: '/',
  },
})
</script>

<template>
  <div>
    <form @submit.prevent="register">
      <p><i>*password should have at least 6 characters</i></p>
      <input v-model="username" type="text" placeholder="Username" data-testid="username">
      <input v-model="password" type="password" placeholder="Password" data-testid="password">
      <button type="submit" data-testid="submit">
        sign up
      </button>
    </form>
    <div v-if="response">
      <h2>Response</h2>
      <pre>{{ response }}</pre>
    </div>
  </div>
</template>
