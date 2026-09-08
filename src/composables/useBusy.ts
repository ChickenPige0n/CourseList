import { readonly, ref } from 'vue'

const busy = ref(false)
const message = ref('')

/**
 * 全局忙碌遮罩状态（读取文件等短时操作）。
 * 与 `useToast` 一样放在模块作用域，避免 props 层层传递。
 */
export function useBusy() {
  return {
    busy: readonly(busy),
    message: readonly(message),
    show(text = '正在读取课程数据…'): void {
      message.value = text
      busy.value = true
    },
    hide(): void {
      busy.value = false
    },
  }
}
