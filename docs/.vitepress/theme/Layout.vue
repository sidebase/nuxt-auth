<script setup>
import DefaultTheme from 'vitepress/theme'
import GithubStarsButton from './components/GithubStarsButton.vue'
import Banner from './components/Banner.vue'

const { Layout } = DefaultTheme

// Banner Configuration
const bannerConfig = {
  // Leave text empty to disable the banner
  text: '✨ NuxtAuth v0.8.0 has been released! ✨',
  button: {
    href: 'https://github.com/sidebase/nuxt-auth/releases/tag/0.8.0',
    text: 'View release notes',
  },
}
</script>

<template>
  <Layout>
    <template #nav-bar-content-after>
      <GithubStarsButton owner="sidebase" repo="nuxt-auth" />
    </template>

    <template #home-hero-before>
      <Banner v-bind="bannerConfig" />
    </template>
  </Layout>
</template>
