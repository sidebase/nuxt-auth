<script setup>
import { FetchError } from 'ofetch'
import { ref } from 'vue'
import { definePageMeta, useAuth } from '#imports'

const { signUp } = useAuth()

const username = ref('')
const password = ref('')
const response = ref()

async function register() {
  try {
    response.value = await signUp({
      username: username.value,
      password: password.value
    }, { preventLoginFlow: true })
  }
  catch (error) {
    if (error instanceof FetchError) {
      response.value = { error: error.message }
    }
    else {
      response.value = { error: 'Failed to sign up' }
    }
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
      <input v-model="username" type="text" placeholder="Username" data-testid="register-username">
      <input v-model="password" type="password" placeholder="Password" data-testid="register-password">
      <button type="submit" data-testid="register-submit">
        sign up
      </button>
    </form>
    <div v-if="response">
      <h2>Response</h2>
      <pre>{{ response }}</pre>
    </div>
  </div>
</template>
