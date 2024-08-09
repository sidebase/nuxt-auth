<script lang="ts" setup>
import { NuxtLink } from '#components'

type ButtonSize = 'xs' | 'sm' | 'md' | 'lg'

withDefaults(defineProps<{
  href?: string
  size?: ButtonSize
  external?: boolean
}>(), { href: undefined, size: 'md' })
defineEmits<{(e: 'click'): void}>()

const buttonSizeClasses: Record<ButtonSize, string> = {
  xs: 'px-2 py-1 text-xs',
  sm: 'px-2 py-1 text-sm',
  md: 'px-2.5 py-1.5 text-sm',
  lg: 'px-6 py-2.5 text-base',
}
</script>

<template>
  <component :is="href ? NuxtLink : 'div'" :href="href" :target="external ? '_blank' : ''">
    <button
      type="button"
      class="block w-full rounded bg-indigo-600 font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
      :class="buttonSizeClasses[size]"
      @click="$emit('click')"
    >
      <slot />
    </button>
  </component>
</template>
