<template>
  <div>
    <h3>Authentication Overview</h3>
    <p>See all available authentication & session information below. Navigate to different sub-pages to test out the app.</p>
    <pre>Status: {{ status }}</pre>
    <pre>Data: {{ data || 'no session data present, are you logged in?' }}</pre>
    <pre>Last refreshed at: {{ lastRefreshedAt || 'no refresh happened' }}</pre>
    <pre>Decoded JWT token: {{ token || 'no token present, are you logged in?' }}</pre>
    <pre>CSRF Token: {{ csrfToken }}</pre>
    <pre>Providers: {{ providers }}</pre>
    <hr>
    <h2>Navigation</h2>
    <p>Navigate to different pages below to test out different things:</p>
    <div>
      <nuxt-link to="/">
        -> manual login, logout, refresh button
      </nuxt-link>
      <br>
      <nuxt-link to="/custom-signin">
        -> custom sign-in page
      </nuxt-link>
      <br>
      <nuxt-link to="/protected/globally">
        -> globally protected page
      </nuxt-link>
      <br>
      <nuxt-link to="/protected/locally">
        -> locally protected page (only works if global middleware disabled)
      </nuxt-link>
      <br>
      <nuxt-link to="/always-unprotected">
        -> page that is always unprotected
      </nuxt-link>
      <br>
      <nuxt-link to="/api/protected/inline" external>
        -> API endpoint protected inline
      </nuxt-link>
      <br>
      <nuxt-link to="/api/protected/middleware" external>
        -> API endpoint protected middleware
      </nuxt-link>
      <br>
    </div>
    <hr>
    <p>The page content of "{{ route.path }}"</p>
    <NuxtPage />
  </div>
</template>

<script setup lang="ts">
import { useSession, useRoute, useFetch, useRequestHeaders } from '#imports'

const { data, status, lastRefreshedAt, getCsrfToken, getProviders } = useSession()

const providers = await getProviders()
const csrfToken = await getCsrfToken()

const headers = useRequestHeaders(['cookie']) as HeadersInit
const { data: token } = await useFetch('/api/token', { headers })

const route = useRoute()
</script>
