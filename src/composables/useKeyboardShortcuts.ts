import { onMounted, onScopeDispose } from 'vue'

import { useScheduleStore } from '@/stores/schedule'
import { useToast } from '@/composables/useToast'

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  if (target.isContentEditable) return true
  return /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)
}

/**
 * 全局快捷键：
 *  - `T` 回到今天
 *  - `Ctrl/⌘ + ←/→` 切换周
 * Esc 由原生 `<dialog>` 处理，无需额外监听。
 */
export function useKeyboardShortcuts(): void {
  const schedule = useScheduleStore()
  const toast = useToast()

  const onKeyDown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape') return

    if ((event.ctrlKey || event.metaKey) && (event.key === 'ArrowLeft' || event.key === 'ArrowRight')) {
      event.preventDefault()
      schedule.shiftWeek(event.key === 'ArrowLeft' ? -1 : 1)
      return
    }

    if ((event.key === 't' || event.key === 'T') && !isTypingTarget(event.target) && !event.ctrlKey && !event.metaKey && !event.altKey) {
      schedule.goToToday()
      toast.info('已跳转到今天')
    }
  }

  onMounted(() => window.addEventListener('keydown', onKeyDown))
  onScopeDispose(() => window.removeEventListener('keydown', onKeyDown))
}
