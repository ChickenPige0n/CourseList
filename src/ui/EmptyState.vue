<script setup lang="ts">
withDefaults(
  defineProps<{
    title: string
    text?: string
  }>(),
  { text: '' },
)
</script>

<template>
  <div class="empty">
    <span class="empty-icon" aria-hidden="true">
      <slot name="icon" />
    </span>
    <h3 class="empty-title">{{ title }}</h3>
    <p v-if="text" class="empty-text">{{ text }}</p>
    <p v-if="$slots.actions" class="empty-actions">
      <slot name="actions" />
    </p>
  </div>
</template>

<style scoped>
.empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: var(--space-16) var(--space-4) 4.5rem;
    border-top: 1px solid var(--line);
    text-align: center;
}

.empty-icon {
    display: grid;
    place-items: center;
    width: 3rem;
    height: 3rem;
    margin-bottom: var(--space-4);
    border: 1px solid var(--line);
    border-radius: 50%;
    color: var(--ink-3);
}

.empty-title {
    font-size: var(--text-xl);
    font-weight: 600;
}

.empty-text {
    max-width: 26rem;
    margin-top: var(--space-2);
    color: var(--ink-3);
    font-size: var(--text-md);
    text-wrap: pretty;
}

.empty-actions {
    margin-top: var(--space-5);
}
</style>
