<script setup>
import DefaultTheme from 'vitepress/theme'
import GithubStarsButton from './GithubStarsButton.vue'
import Banner from './Banner.vue'

const { Layout } = DefaultTheme

// Banner Configuration
const bannerConfig = {
  // Leave text empty to disable the banner
  text: '🚀 NuxtAuth v0.9.0 has been released!',
  button: {
    href: '/upgrade/version-0.9.0',
    text: 'View upgrade guide',
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
