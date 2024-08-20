<script lang="ts" setup>
type BadgeType = 'info' | 'tip' | 'warning' | 'danger' | 'authjs' | 'local' | 'refresh' | 'community' | 'official'
withDefaults(defineProps<{
  text: string,
  type?: BadgeType
}>(), { type: 'tip' })
</script>

<template>
  <span class="VPBadge" :class="type">
    {{ text }}
  </span>
</template>

<style scoped>
.VPBadge.authjs {
  color:  #FEFDFF;
  background-color: #2409C9;
}

.VPBadge.local {
  color:  #FEFDFF;
  background-color: #F9B903;
}

.VPBadge.refresh {
  color:  #FEFDFF;
  background-color: #62cec9;
}

.VPBadge.community {
  color: #FEFDFF;
  background-color: #3B82F6;
}

.VPBadge.official {
  color: #FEFDFF;
  background-color: #F39B0A;
}
</style>
