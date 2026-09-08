<script setup lang="ts">
import { onMounted, ref, useId, watch } from 'vue'

import IconButton from '@/ui/IconButton.vue'

const props = withDefaults(
  defineProps<{
    open: boolean
    title: string
    subtitle?: string
    /** sm = 窄面板（课程详情），md = 默认（数据面板）。 */
    size?: 'sm' | 'md'
  }>(),
  { size: 'md', subtitle: '' },
)

const emit = defineEmits<{ close: [] }>()

const titleId = useId()
const dialog = ref<HTMLDialogElement | null>(null)
const visible = ref(false)
let closeTimer: number | undefined

/** 打开/关闭：原生 <dialog> 负责焦点陷阱与 inert 背景。 */
function sync(open: boolean): void {
  const element = dialog.value
  if (!element) return

  window.clearTimeout(closeTimer)

  if (open) {
    if (!element.open) element.showModal()
    requestAnimationFrame(() => {
      visible.value = true
    })
    return
  }

  visible.value = false
  closeTimer = window.setTimeout(() => {
    if (element.open) element.close()
  }, 300)
}

onMounted(() => sync(props.open))
watch(() => props.open, sync)

/** Esc：先走动画，再真正关闭，保证父组件状态同步。 */
function onCancel(event: Event): void {
  event.preventDefault()
  emit('close')
}

function onBackdropClick(event: MouseEvent): void {
  if (event.target === dialog.value) emit('close')
}

/** 原生关闭（含动画结束后）时把状态交还给父组件。 */
function onNativeClose(): void {
  visible.value = false
  emit('close')
}
</script>

<template>
  <dialog
    ref="dialog"
    class="sheet"
    :class="{ 'sheet-sm': size === 'sm', 'is-open': visible }"
    :aria-labelledby="titleId"
    @cancel="onCancel"
    @click="onBackdropClick"
    @close="onNativeClose"
  >
    <div class="sheet-head">
      <div class="sheet-heading">
        <h2 :id="titleId" class="sheet-title">{{ title }}</h2>
        <p v-if="subtitle" class="sheet-sub">{{ subtitle }}</p>
      </div>
      <IconButton icon="x" :label="`关闭${title}`" @click="emit('close')" />
    </div>

    <div class="sheet-body">
      <slot />
    </div>

    <div v-if="$slots.footer" class="sheet-foot">
      <slot name="footer" />
    </div>
  </dialog>
</template>

<style scoped>
.sheet {
    width: min(44rem, calc(100vw - 2rem));
    max-height: min(86svh, 46rem);
    padding: 0;
    border: 1px solid var(--line);
    border-radius: var(--radius-lg);
    background: var(--surface);
    color: var(--ink);
    box-shadow: var(--shadow-pop);
    overflow: hidden;
}

.sheet-sm {
    width: min(30rem, calc(100vw - 2rem));
}

.sheet[open] {
    display: flex;
    flex-direction: column;
    opacity: 0;
    transform: translateY(12px) scale(0.985);
    transition: opacity var(--dur) var(--ease), transform var(--dur-slow) var(--ease-spring);
}

.sheet[open].is-open {
    opacity: 1;
    transform: none;
}

.sheet::backdrop {
    background: rgba(22, 21, 15, 0.42);
    backdrop-filter: blur(2px);
    opacity: 0;
    transition: opacity var(--dur) var(--ease);
}

.sheet.is-open::backdrop {
    opacity: 1;
}

.sheet-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: var(--space-4);
    padding: var(--space-5) var(--space-6);
    border-bottom: 1px solid var(--line);
}

.sheet-heading {
    min-width: 0;
}

.sheet-title {
    font-size: var(--text-xl);
}

.sheet-sub {
    margin-top: 0.2rem;
    color: var(--ink-3);
    font-size: var(--text-sm);
}

.sheet-body {
    flex: 1 1 auto;
    padding: var(--space-6);
    overflow-y: auto;
    overscroll-behavior: contain;
}

.sheet-foot {
    display: flex;
    justify-content: flex-end;
    gap: 0.6rem;
    padding: var(--space-4) var(--space-6);
    border-top: 1px solid var(--line);
}

@media (max-width: 44rem) {
    .sheet {
        width: 100%;
        max-width: none;
        max-height: 92svh;
        margin: 0;
        position: fixed;
        inset: auto 0 0 0;
        border-radius: var(--radius-lg) var(--radius-lg) 0 0;
        border-bottom: 0;
    }

    .sheet[open] {
        transform: translateY(20px);
    }

    .sheet-head,
    .sheet-body,
    .sheet-foot {
        padding-inline: var(--space-4);
    }
}
</style>
