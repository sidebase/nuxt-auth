<template>
  <div>
    <h3>Authentication Overview</h3>
    <p>See all available authentication & session information below. Navigate to different sub-pages to test out the app.</p>
    <pre>Status: {{ session.status }}</pre>
    <pre v-if="session.status === 'authenticated'">Data: {{ session.data }}</pre>
    <pre v-else>Data: No session data present, are you logged in?</pre>
    <pre>Decoded JWT token from server: {{ token || 'No token present, are you logged in?' }}</pre>
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
      <nuxt-link to="/protected/globally">
        -> globally protected page
      </nuxt-link>
      <br>
      <nuxt-link to="/protected/inline">
        -> inline protected page
      </nuxt-link>
      <br>
      <nuxt-link to="/protected/named">
        -> named protected page
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

const { session, getCsrfToken, getProviders } = await useSession({ required: false })

const providers = await getProviders()
const csrfToken = await getCsrfToken()

const headers = useRequestHeaders(['cookie'])
const { data: token } = await useFetch('/api/token', { headers: { cookie: headers.cookie } })

const route = useRoute()
</script>
