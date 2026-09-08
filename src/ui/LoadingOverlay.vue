<script setup lang="ts">
withDefaults(
  defineProps<{
    active: boolean
    text?: string
  }>(),
  { text: '正在读取课程数据…' },
)
</script>

<template>
  <div class="loader" :class="{ 'is-open': active }" :aria-hidden="active ? 'false' : 'true'">
    <span class="loader-spinner" aria-hidden="true" />
    <span class="loader-text" role="status" aria-live="polite">{{ active ? text : '' }}</span>
  </div>
</template>

<style scoped>
.loader {
    position: fixed;
    inset: 0;
    z-index: 90;
    display: grid;
    place-content: center;
    justify-items: center;
    gap: 1rem;
    background: var(--canvas);
    background: color-mix(in srgb, var(--canvas) 82%, transparent);
    backdrop-filter: blur(6px);
    opacity: 0;
    visibility: hidden;
    transition: opacity var(--dur) var(--ease), visibility var(--dur) var(--ease);
}

.loader.is-open {
    opacity: 1;
    visibility: visible;
}

.loader-spinner {
    width: 1.5rem;
    height: 1.5rem;
    border: 1.5px solid var(--line-2);
    border-top-color: var(--accent);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
}

.loader-text {
    color: var(--ink-3);
    font-size: var(--text-base);
}
</style>
