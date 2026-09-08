import { onMounted, onScopeDispose, ref, type Ref } from 'vue'

/** 窗口滚动超过阈值时为 true（用于给吸顶头部加投影）。 */
export function useWindowScrolled(threshold = 4): Ref<boolean> {
  const scrolled = ref(false)

  const update = (): void => {
    scrolled.value = window.scrollY > threshold
  }

  onMounted(() => {
    update()
    window.addEventListener('scroll', update, { passive: true })
  })
  onScopeDispose(() => window.removeEventListener('scroll', update))

  return scrolled
}
