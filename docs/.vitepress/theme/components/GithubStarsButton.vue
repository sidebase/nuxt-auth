<script lang="ts" setup>
import { onMounted, ref } from 'vue'
import StarIcon from './StarIcon.vue'

const props = defineProps<{
  owner: string
  repo: string
}>()

const count = ref(0)

async function fetchCount() {
  const res = await fetch(`https://api.github.com/repos/${props.owner}/${props.repo}`)
  const resJson = await res.json()
  count.value = resJson.stargazers_count ?? 0
}
onMounted(fetchCount)
</script>

<template>
  <div class="Wrapper">
    <a
      title="Github"
      class="Button"
      :href="`https://github.com/${owner}/${repo}`"
      target="_blank"
      rel="noreferrer noopener"
    >
      <StarIcon />
      Star
    </a>
    <a
      class="Count"
      :href="`https://github.com/${owner}/${repo}/stargazers`"
      aria-label="{label}"
      target="_blank"
      rel="noreferrer noopener"
    >
      {{ new Intl.NumberFormat().format(count) }}
    </a>
  </div>
</template>

<style scoped>
.Wrapper {
  margin-left: 14px;
  display: block;
}

@media only screen and (max-width: 800px) {
  .Wrapper {
    display: none;
  }
}

.Button {
  display: flex;
  align-items: center;
  gap: 5px;

  padding: 3px 10px;
  border-radius: 8px;
  border-bottom-right-radius: 0;
  border-top-right-radius: 0;
  float: left;
  cursor: pointer;
  position: relative;
  user-select: none;
  vertical-align: middle;
  white-space: nowrap;
  text-decoration: none;

  font-size: 13px;
  font-weight: 600;
  line-height: 20px;

  background-color: #FAFBFC;
  border: 1px solid rgba(27, 31, 35, 0.2);
  border-right: 0px;
  color: inherit;
}

.Count {
  border-bottom-right-radius: 8px;
  border-left: 0;
  border-top-right-radius: 8px;
  float: left;
  padding: 3px 10px;
  vertical-align: middle;

  font-size: 13px;
  font-weight: 600;
  line-height: 20px;
  text-decoration: none;

  background-color: #fff;
  border: 1px solid rgba(27, 31, 35, 0.2);
}

.dark .Button {
  border: 1px solid #4d4d4f;
  background-color: #4d4d4f;
}

.dark .Count {
  background-color: #65666A;
}
</style>
