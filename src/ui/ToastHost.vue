<script setup lang="ts">
import AppIcon from '@/ui/AppIcon.vue'
import { useToast, type ToastType } from '@/composables/useToast'
import type { IconName } from '@/ui/icons'

const { toasts, dismiss } = useToast()

const ICON_BY_TYPE: Record<ToastType, IconName> = {
  success: 'check-circle',
  error: 'x-circle',
  warning: 'alert-triangle',
  info: 'info',
}
</script>

<template>
  <div class="toast-host">
    <TransitionGroup name="toast">
      <div
        v-for="toast in toasts"
        :key="toast.id"
        class="toast"
        :class="`toast--${toast.type}`"
        :role="toast.type === 'error' ? 'alert' : 'status'"
        aria-atomic="true"
      >
        <span class="toast-icon">
          <AppIcon :name="ICON_BY_TYPE[toast.type]" size="1.05rem" />
        </span>
        <span class="toast-text">{{ toast.message }}</span>
        <button type="button" class="toast-close" aria-label="关闭提示" @click="dismiss(toast.id)">
          <AppIcon name="x" size="0.85rem" />
        </button>
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.toast-host {
    position: fixed;
    left: 50%;
    bottom: 1.5rem;
    z-index: 100;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    width: max-content;
    max-width: min(28rem, calc(100vw - 2rem));
    transform: translateX(-50%);
    pointer-events: none;
}

.toast {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    max-width: 100%;
    padding: 0.7rem 0.85rem 0.7rem 1.1rem;
    border-radius: 999px;
    background: var(--ink);
    color: var(--canvas);
    font-size: var(--text-base);
    text-wrap: pretty;
    box-shadow: 0 18px 40px -18px rgba(22, 21, 15, 0.6);
    pointer-events: auto;
}

.toast-text {
    min-width: 0;
}

.toast-close {
    display: grid;
    place-items: center;
    width: 1.75rem;
    height: 1.75rem;
    flex: none;
    padding: 0;
    border: 0;
    border-radius: 999px;
    background: transparent;
    color: inherit;
    opacity: 0.65;
    cursor: pointer;
}

.toast-close:hover {
    opacity: 1;
    background: rgba(255, 255, 255, 0.12);
}

.toast--success .toast-icon {
    color: #6cd39c;
}

.toast--error .toast-icon {
    color: #ff8f78;
}

.toast--warning .toast-icon {
    color: #e6b45c;
}

.toast--info .toast-icon {
    color: #9fb6ff;
}

/* 进出场与重排动画 */
.toast-enter-active,
.toast-leave-active {
    transition: opacity var(--dur) var(--ease), transform var(--dur) var(--ease);
}

.toast-enter-from,
.toast-leave-to {
    opacity: 0;
    transform: translateY(1.25rem) scale(0.98);
}

.toast-leave-active {
    position: absolute;
}

.toast-move {
    transition: transform var(--dur) var(--ease);
}
</style>
