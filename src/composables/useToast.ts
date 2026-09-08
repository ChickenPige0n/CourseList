import { readonly, ref } from 'vue'

export type ToastType = 'success' | 'error' | 'warning' | 'info'

export interface ToastItem {
  readonly id: number
  readonly message: string
  readonly type: ToastType
  readonly duration: number
}

const DEFAULT_DURATION = 3_200
const MAX_VISIBLE = 3

/**
 * 提示消息队列。
 *
 * 状态放在模块作用域，任意组件（含深层子组件）都可以直接
 * `useToast().success(...)`，不需要层层透传 props / emit。
 */
const toasts = ref<ToastItem[]>([])
let seed = 0

function dismiss(id: number): void {
  toasts.value = toasts.value.filter((toast) => toast.id !== id)
}

export function useToast() {
  function push(message: string, type: ToastType = 'info', duration = DEFAULT_DURATION): number {
    seed += 1
    const toast: ToastItem = { id: seed, message, type, duration }
    toasts.value = [...toasts.value.slice(-(MAX_VISIBLE - 1)), toast]
    if (duration > 0) {
      window.setTimeout(() => dismiss(toast.id), duration)
    }
    return toast.id
  }

  return {
    toasts: readonly(toasts),
    dismiss,
    push,
    success: (message: string, duration?: number) => push(message, 'success', duration),
    error: (message: string, duration?: number) => push(message, 'error', duration),
    warning: (message: string, duration?: number) => push(message, 'warning', duration),
    info: (message: string, duration?: number) => push(message, 'info', duration),
  }
}
