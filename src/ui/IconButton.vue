<script setup lang="ts">
import AppIcon from '@/ui/AppIcon.vue'
import type { IconName } from '@/ui/icons'

withDefaults(
  defineProps<{
    icon: IconName
    /** 无障碍名称，必填（图标本身对读屏隐藏）。 */
    label: string
    /** 切换类按钮传入布尔值，会渲染为 aria-pressed。 */
    pressed?: boolean
  }>(),
  { pressed: undefined },
)
</script>

<template>
  <button
    type="button"
    class="icon-btn"
    :aria-label="label"
    :title="label"
    :aria-pressed="pressed === undefined ? undefined : pressed ? 'true' : 'false'"
  >
    <AppIcon :name="icon" />
  </button>
</template>

<style scoped>
.icon-btn {
    display: grid;
    place-items: center;
    width: 2.5rem;
    height: 2.5rem;
    flex: none;
    padding: 0;
    border: 1px solid var(--line);
    border-radius: 999px;
    background: var(--surface);
    cursor: pointer;
    transition: background var(--dur) var(--ease), border-color var(--dur) var(--ease),
        color var(--dur) var(--ease), transform var(--dur-fast) var(--ease);
}

.icon-btn:hover {
    background: var(--surface-2);
    border-color: var(--line-2);
    color: var(--accent);
}

.icon-btn:active {
    transform: scale(0.94);
}
</style>
