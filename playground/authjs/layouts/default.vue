<script setup lang="ts">
import { useAuth, useFetch, useRequestHeaders } from '#imports'

const { data, status, lastRefreshedAt, getCsrfToken, getProviders, signIn, signOut, getSession } = useAuth()

const providers = await getProviders()
const csrfToken = await getCsrfToken()

const headers = useRequestHeaders(['cookie']) as HeadersInit
const { data: token } = await useFetch('/api/token', { headers })

const links = [
  { label: 'Home', href: '/' },
  { label: 'Custom Sign In Page', href: '/custom-signin' },
  { label: 'Guest', href: '/guest' },
  { label: 'Cached', href: '/with-caching' },
  { label: 'Unprotected', href: '/always-unprotected' },
  { label: 'Protected (Globally)', href: '/protected/globally' },
  { label: 'Protected (Locally)', href: '/protected/locally' },
  { label: 'API Protected (Inline)', href: '/api/protected/inline' },
  { label: 'API Protected (Middleware)', href: '/api/protected/middleware' }
]
</script>

<template>
  <div>
    <AuthBanner
      title="AuthJS Playground"
      text="This is the playground of the sidebase/nuxt-auth authjs provider."
      :button="{ text: 'Read Docs', href: 'https://auth.sidebase.io/guide/authjs/quick-start' }"
    />
    <div class="relative my-4 max-w-7xl mx-auto space-y-4">
      <slot />
      <div class="space-y-2 border-t">
        <div class="pt-4">
          <h1 class="text-3xl font-semibold">
            Authentication Overview
          </h1>
          <p class="font-light text-lg">
            See all available authentication & session information below.
          </p>
        </div>
        <AuthDataViewer>
          <span>Status:</span> {{ status }}
        </AuthDataViewer>
        <AuthDataViewer>
          <span>Data:</span> {{ data || 'no session data present, are you logged in?' }}
        </AuthDataViewer>
        <AuthDataViewer>
          <span>Last refreshed at:</span> {{ lastRefreshedAt || 'no refresh happened' }}
        </AuthDataViewer>
        <AuthDataViewer>
          <span>Decoded JWT token:</span> {{ token || 'no token present, are you logged in?' }}
        </AuthDataViewer>
        <AuthDataViewer>
          <span>CSRF Token:</span> {{ csrfToken }}
        </AuthDataViewer>
        <AuthDataViewer>
          <span>Providers:</span> {{ providers }}
        </AuthDataViewer>
      </div>

      <AuthSideItems>
        <template #actions>
          <div class="flex flex-col gap-1">
            <AuthButton @click="signIn(undefined, { callbackUrl: '/' })">
              Sign In
            </AuthButton>
            <AuthButton @click="signOut()">
              Sign Out
            </AuthButton>
            <AuthButton @click="signIn('credentials', { callbackUrl: '/', username: 'jsmith', password: 'hunter2' })">
              Sign In (Credentials)
            </AuthButton>
            <AuthButton @click="signIn('github', { callbackUrl: '/' })">
              Sign In (Github)
            </AuthButton>
            <AuthButton @click="signIn(undefined, { callbackUrl: '/protected/named' })">
              Sign In (with redirect to protected page)
            </AuthButton>
            <AuthButton click="signOut({ callbackUrl: '/signout' })">
              Sign Out
            </AuthButton>
            <AuthButton @click="getSession({ required: false })">
              Refresh Session
            </AuthButton>
          </div>
        </template>

        <template #links>
          <NuxtLink
            v-for="link in links"
            :key="link.href"
            :href="link.href"
            class="p-1 hover:text-blue-500 hover:bg-gray-200 rounded"
          >
            {{ link.label }}
          </NuxtLink>
        </template>
      </AuthSideItems>
    </div>
  </div>
</template>
