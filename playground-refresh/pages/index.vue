<script setup lang="ts">
import { definePageMeta } from '#imports'
definePageMeta({ auth: false })
</script>

<template>
  <div>
    <nuxt-link to="/">
      -> manual login, logout, refresh button
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
    <nuxt-link to="/guest">
      -> guest mode
    </nuxt-link>
    <br>
    <div>select one of the above actions to get started.</div>
  </div>
</template>
