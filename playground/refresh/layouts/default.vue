<script setup lang="ts">
import { ref } from 'vue'
import { useAuth } from '#imports'

const { signIn, token, data, status, refreshToken, refresh, lastRefreshedAt, signOut, getSession } = useAuth()

const username = ref('jsmith')
const password = ref('hunter2')

const links = [
  { label: 'Home', href: '/' },
  { label: 'Guest', href: '/guest' },
  { label: 'Cached', href: '/with-caching' },
  { label: 'Unprotected', href: '/always-unprotected' },
  { label: 'Protected (Globally)', href: '/protected/globally' },
  { label: 'Protected (Locally)', href: '/protected/locally' },
]
</script>

<template>
  <div>
    <AuthBanner
      title="Refresh Playground"
      text="This is the playground of the sidebase/nuxt-auth refresh provider."
      :button="{ text: 'Read Docs', href: 'https://auth.sidebase.io/guide/local/quick-start#refresh-token' }"
    />
    <div class="relative my-4 max-w-7xl mx-auto space-y-4">
      <slot />

      <div v-if="status === 'unauthenticated'" class="flex flex-col gap-2">
        <input v-model="username" type="text" placeholder="Username" data-testid="username" class="bg-gray-100 rounded p-2">
        <input v-model="password" type="password" placeholder="Password" data-testid="password" class="bg-gray-100 rounded p-2">
        <AuthButton data-testid="submit" @click="signIn({ username, password })">
          Sign In
        </AuthButton>
      </div>

      <div class="space-y-2 border-t pt-4">
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
          <span>JWT token:</span> {{ token || 'no token present, are you logged in?' }}
        </AuthDataViewer>
        <AuthDataViewer>
          <span>Refresh token:</span> {{ refreshToken || "no refreshToken present, are you logged in?" }}
        </AuthDataViewer>
      </div>

      <AuthSideItems>
        <template #actions>
          <div class="flex flex-col gap-1">
            <AuthButton :disabled="status === 'authenticated'" @click="signIn({ username, password })">
              Sign In
            </AuthButton>
            <AuthButton :disabled="status === 'unauthenticated'" @click="signOut">
              Sign Out
            </AuthButton>
            <AuthButton :disabled="status === 'authenticated'" @click="signIn({ username, password }, { callbackUrl: '/protected/globally' })">
              Sign In (with redirect to protected page)
            </AuthButton>
            <AuthButton @click="getSession({ required: false })">
              Refresh Session (required: false)
            </AuthButton>
            <AuthButton @click="getSession({ required: true, callbackUrl: '/' })">
              Refresh Session (required: true)
            </AuthButton>
            <AuthButton :disabled="status === 'unauthenticated'" @click="refresh()">
              Refresh Tokens
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
