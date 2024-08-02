<script setup>
import DefaultTheme from 'vitepress/theme'
import GithubStarsButton from './components/GithubStarsButton.vue'
import Banner from './components/Banner.vue'

const { Layout } = DefaultTheme
</script>

<template>
  <Layout>
    <template #nav-bar-content-after>
      <GithubStarsButton owner="sidebase" repo="nuxt-auth" />
    </template>

    <template #home-hero-before>
      <Banner
        text="✨ NuxtAuth v0.8.0 has been released! ✨"
        :button="{
          href: 'https://github.com/sidebase/nuxt-auth/releases/tag/0.8.0',
          text: 'View release notes'
        }"
      />
    </template>
  </Layout>
</template>
