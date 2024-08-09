<script lang="ts" setup>
defineProps<{
  title: string
  text: string
  button?: {
    href: string
    text: string
  }
}>()
</script>

<template>
  <div class="hidden relative isolate md:flex items-center justify-center gap-x-6 overflow-hidden bg-gray-50 px-3 py-4">
    <div class="absolute left-[max(-7rem,calc(50%-52rem))] top-1/2 -z-10 -translate-y-1/2 transform-gpu blur-2xl" aria-hidden="true">
      <div class="aspect-[577/310] w-[36.0625rem] bg-gradient-to-r from-[#ff80b5] to-[#2A8459] opacity-40" style="clip-path: polygon(74.8% 41.9%, 97.2% 73.2%, 100% 34.9%, 92.5% 0.4%, 87.5% 0%, 75% 28.6%, 58.5% 54.6%, 50.1% 56.8%, 46.9% 44%, 48.3% 17.4%, 24.7% 53.9%, 0% 27.9%, 11.9% 74.2%, 24.9% 54.1%, 68.6% 100%, 74.8% 41.9%)" />
    </div>
    <div class="absolute left-[max(45rem,calc(50%+8rem))] top-1/2 -z-10 -translate-y-1/2 transform-gpu blur-2xl" aria-hidden="true">
      <div class="aspect-[577/310] w-[36.0625rem] bg-gradient-to-r from-[#ff80b5] to-[#2A8459] opacity-40" style="clip-path: polygon(74.8% 41.9%, 97.2% 73.2%, 100% 34.9%, 92.5% 0.4%, 87.5% 0%, 75% 28.6%, 58.5% 54.6%, 50.1% 56.8%, 46.9% 44%, 48.3% 17.4%, 24.7% 53.9%, 0% 27.9%, 11.9% 74.2%, 24.9% 54.1%, 68.6% 100%, 74.8% 41.9%)" />
    </div>

    <div class="flex flex-wrap items-center gap-x-4 gap-y-2">
      <p class="leading-6 text-gray-900">
        <strong class="font-semibold">
          {{ title }}
        </strong>
        {{ text }}
      </p>
      <AuthButton v-if="button" size="xs" :href="button.href" :external="true">
        {{ button.text }}
      </AuthButton>
    </div>
  </div>
</template>
