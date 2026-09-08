<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    variant?: 'default' | 'primary'
    type?: 'button' | 'submit' | 'reset'
    disabled?: boolean
    /** 在容器内撑满宽度（移动端弹窗底部按钮）。 */
    block?: boolean
    /** 传入后渲染为链接而不是按钮。 */
    href?: string
    /** 在新标签页打开（自动补 rel="noopener"）。 */
    external?: boolean
  }>(),
  { variant: 'default', type: 'button', disabled: false, block: false, href: undefined, external: false },
)

const classes = computed(() => ({
  'btn-primary': props.variant === 'primary',
  'btn-block': props.block,
}))
</script>

<template>
  <a
    v-if="href"
    class="btn"
    :class="classes"
    :href="href"
    :target="external ? '_blank' : undefined"
    :rel="external ? 'noopener' : undefined"
  >
    <slot />
  </a>

  <button v-else class="btn" :class="classes" :type="type" :disabled="disabled">
    <slot />
  </button>
</template>

<style scoped>
.btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.4rem;
    min-height: 2.5rem;
    padding: 0 0.95rem;
    border: 1px solid var(--line);
    border-radius: 999px;
    background: var(--surface);
    color: var(--ink);
    font-size: var(--text-base);
    font-weight: 500;
    white-space: nowrap;
    text-decoration: none;
    cursor: pointer;
    transition: background var(--dur) var(--ease), border-color var(--dur) var(--ease),
        color var(--dur) var(--ease), transform var(--dur-fast) var(--ease);
}

.btn:hover:not(:disabled) {
    background: var(--surface-2);
    border-color: var(--line-2);
}

.btn:active:not(:disabled) {
    transform: scale(0.975);
}

.btn:disabled {
    opacity: 0.55;
    cursor: not-allowed;
}

.btn-block {
    flex: 1 1 auto;
}

.btn-primary {
    background: var(--ink);
    border-color: var(--ink);
    color: var(--canvas);
    font-weight: 600;
}

.btn-primary:hover:not(:disabled) {
    background: var(--accent);
    border-color: var(--accent);
    color: var(--accent-ink);
}
</style>
