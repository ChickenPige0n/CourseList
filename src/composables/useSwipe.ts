import { onScopeDispose, watch, type Ref } from 'vue'

export interface SwipeOptions {
  /** 触发所需的最小水平位移（px）。 */
  threshold?: number
  /** 向左滑（手指从右往左）。 */
  onSwipeLeft?: () => void
  /** 向右滑。 */
  onSwipeRight?: () => void
}

/**
 * 在元素上监听水平滑动手势（移动端切换周 / 切换日期）。
 * 垂直位移大于水平位移时忽略，避免与页面滚动冲突。
 */
export function useSwipe(
  target: Ref<HTMLElement | null | undefined>,
  options: SwipeOptions,
): void {
  const { threshold = 60, onSwipeLeft, onSwipeRight } = options

  let startX = 0
  let startY = 0

  const onTouchStart = (event: TouchEvent): void => {
    const touch = event.changedTouches[0]
    if (!touch) return
    startX = touch.screenX
    startY = touch.screenY
  }

  const onTouchEnd = (event: TouchEvent): void => {
    const touch = event.changedTouches[0]
    if (!touch) return
    const deltaX = touch.screenX - startX
    const deltaY = touch.screenY - startY
    if (Math.abs(deltaX) <= Math.abs(deltaY) || Math.abs(deltaX) < threshold) return
    if (deltaX < 0) onSwipeLeft?.()
    else onSwipeRight?.()
  }

  let attached: HTMLElement | null = null

  function detach(): void {
    if (!attached) return
    attached.removeEventListener('touchstart', onTouchStart)
    attached.removeEventListener('touchend', onTouchEnd)
    attached = null
  }

  watch(
    target,
    (element) => {
      detach()
      if (!element) return
      element.addEventListener('touchstart', onTouchStart, { passive: true })
      element.addEventListener('touchend', onTouchEnd, { passive: true })
      attached = element
    },
    { immediate: true },
  )

  onScopeDispose(detach)
}
