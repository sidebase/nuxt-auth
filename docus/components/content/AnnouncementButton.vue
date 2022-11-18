<script setup>
defineProps({
  to: {
    type: String,
    default: ''
  },
  label: {
    type: String,
    default: ''
  }
})
</script>

<template>
  <NuxtLink :to="to" class="AnnouncementButton">
    <Icon name="heroicons-solid:bolt" />
    <span class="font-medium text-sm">{{ label }}</span>
  </NuxtLink>
</template>

<style scoped>
.AnnouncementButton {
  display: flex;
  font-size: 15px;
  border: solid #0B9A71 2px;
  padding: 10px 14px;
  border-radius: 10px;
  margin-bottom: 20px;
  align-items: center;
  max-width: fit-content;
  color: #5BF3C7;
  transition: all 300ms ease-in-out;
}

.AnnouncementButton:hover {
  background-color: rgba(11, 154, 113, 0.6);
  color: white;
}

.AnnouncementButton span {
  margin-left: 5px;
  font-weight: 500;
  letter-spacing: 0.01rem;
}
</style>
