<script lang="ts" setup>
import Tag from './Tag.vue'

type RecipeType = 'official' | 'community'
type RecipeProviders = 'authjs' | 'local' | 'refresh'

withDefaults(defineProps<{
  type?: RecipeType
  providers?: RecipeProviders[]
  tags?: string[]
  author?: string
}>(), {
  type: 'community',
  providers: () => ['authjs', 'local', 'refresh'],
  tags: () => []
})
</script>

<template>
  <hr>
  <div class="RecipeHeader">
    <div class="Tags">
      <Tag v-if="type === 'official'" text="official" type="official" />
      <Tag v-else text="community" type="community" />
      <Tag v-for="provider in providers" :key="provider" :text="provider" :type="provider" />
      <Tag v-for="tag in tags" :key="tag" :text="tag" type="info" />
    </div>
    <a v-if="author" class="Avatar" :href="`https://github.com/${author}`" target="_blank" rel="noreferrer noopener">
      <span>{{ author }}</span>
      <img :src="`https://github.com/${author}.png?size=100`" />
    </a>
  </div>
  <hr>
</template>

<style scoped>
.RecipeHeader {
  display: flex;
  align-items: center;
  justify-content: space-between;
  column-gap: 0.5rem;

  margin-top: 10px;
  margin-bottom: 10px;
}
.Avatar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  column-gap: 0.5rem;
}
.Avatar span {
  font-size: 14px;
  font-weight: 600;
}
.Avatar img {
  border-radius: 50%;
  height: 25px;
  width: 25px;
}
.Tags {
  display: flex;
  align-items: center;
  justify-content: space-between;
  column-gap: 0.1rem;
}
</style>
