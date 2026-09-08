<script setup lang="ts">
import { computed } from 'vue'

import { getIcon, type IconName } from '@/ui/icons'

const props = withDefaults(
  defineProps<{
    name: IconName
    /** 任意 CSS 尺寸，默认 1.15rem。 */
    size?: string
    /** 描边粗细，默认 1.75（细线更贴合编辑风排版）。 */
    strokeWidth?: number
  }>(),
  { size: '1.15rem', strokeWidth: 1.75 },
)

const icon = computed(() => getIcon(props.name))
</script>

<template>
  <svg
    class="icon"
    :style="{ width: props.size, height: props.size }"
    viewBox="0 0 24 24"
    :fill="icon.filled ? 'currentColor' : 'none'"
    :stroke="icon.filled ? 'none' : 'currentColor'"
    :stroke-width="props.strokeWidth"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    focusable="false"
    v-html="icon.body"
  />
</template>

<style scoped>
.icon {
    display: block;
    flex: none;
}
</style>
