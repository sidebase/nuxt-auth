<script setup>
import DefaultTheme from 'vitepress/theme'
import GithubStarsButton from './GithubStarsButton.vue'
import Banner from './Banner.vue'
import Tag from './Tag.vue'

const { Layout } = DefaultTheme

// Banner Configuration
const isBannerEnabled = true
const bannerConfig = {
  // Leave text empty to disable the banner
  text: '🚀 NuxtAuth v1.0.0 has been released!',
  button: {
    href: '/upgrade/version-1.0',
    text: 'View upgrade guide',
  },
}
</script>

<template>
  <Layout>
    <template #nav-bar-content-after>
      <GithubStarsButton owner="sidebase" repo="nuxt-auth" />
    </template>

    <template v-if="isBannerEnabled" #home-hero-before>
      <Banner v-bind="bannerConfig" />
    </template>

    <template #home-hero-info-before>
      <a href="/upgrade/version-1.0">
        <Tag text="Version 1.0.0" />
      </a>
    </template>
  </Layout>
</template>
