<template>
  <div>
    <h3>Authentication Overview</h3>
    <p>See all available authentication & session information below. Navigate to different sub-pages to test out the app.</p>
    <pre>Status: {{ status }}</pre>
    <pre>Data: {{ data }}</pre>
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
    </div>
    <hr>
    <p>The page content of "{{ route.path }}"</p>
    <NuxtPage />
  </div>
</template>

<script setup lang="ts">
import { useRoute } from 'vue-router'
import { useSession } from '#imports'

const { data, status, getCsrfToken, getProviders } = await useSession({ required: false })

const providers = await getProviders()
const csrfToken = await getCsrfToken()

const route = useRoute()
</script>
