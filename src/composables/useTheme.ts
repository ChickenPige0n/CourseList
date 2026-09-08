import { onScopeDispose, watch } from 'vue'

import { usePreferencesStore } from '@/stores/preferences'

/**
 * 把主题偏好同步到 `<html data-theme>`，并跟随系统主题变化。
 *
 * 只在根组件调用一次。
 */
export function useTheme(): void {
  const preferences = usePreferencesStore()

  const media =
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia('(prefers-color-scheme: dark)')
      : null

  preferences.setSystemPrefersDark(media?.matches ?? false)

  const onChange = (event: MediaQueryListEvent): void => {
    preferences.setSystemPrefersDark(event.matches)
  }

  media?.addEventListener('change', onChange)
  onScopeDispose(() => media?.removeEventListener('change', onChange))

  watch(
    () => preferences.resolvedTheme,
    (theme) => {
      document.documentElement.dataset.theme = theme
    },
    { immediate: true },
  )
}
