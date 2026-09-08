import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

import { STORAGE_KEYS, readText, removeKey, writeText } from '@/infrastructure/storage'

/** 主题偏好：跟随系统，或显式锁定浅色/深色。 */
export type ThemePreference = 'light' | 'dark' | 'system'
export type ResolvedTheme = 'light' | 'dark'

/** 用户偏好：主题等。与业务数据分离，便于独立演进。 */
export const usePreferencesStore = defineStore('preferences', () => {
  const storedTheme = readText(STORAGE_KEYS.theme)
  const theme = ref<ThemePreference>(
    storedTheme === 'light' || storedTheme === 'dark' ? storedTheme : 'system',
  )
  const systemPrefersDark = ref(false)

  const resolvedTheme = computed<ResolvedTheme>(() =>
    theme.value === 'system' ? (systemPrefersDark.value ? 'dark' : 'light') : theme.value,
  )
  const isDark = computed(() => resolvedTheme.value === 'dark')

  function setSystemPrefersDark(value: boolean): void {
    systemPrefersDark.value = value
  }

  function setTheme(next: ThemePreference): void {
    theme.value = next
    if (next === 'system') removeKey(STORAGE_KEYS.theme)
    else writeText(STORAGE_KEYS.theme, next)
  }

  /** 在浅色 / 深色之间切换（切换后即固定，不再跟随系统）。 */
  function toggleTheme(): void {
    setTheme(isDark.value ? 'light' : 'dark')
  }

  return { theme, resolvedTheme, isDark, setTheme, toggleTheme, setSystemPrefersDark }
})
