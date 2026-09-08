/**
 * localStorage 的安全封装。
 *
 * 隐私模式 / 存储被禁用 / 配额写满时，读写都不抛异常，
 * 由调用方根据返回值决定是否提示用户。
 */

/** 应用使用的存储键（与历史版本保持一致，便于老数据平滑迁移）。 */
export const STORAGE_KEYS = {
  courses: 'smartCourseData',
  theme: 'suat-course-theme',
} as const

function getStore(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage
  } catch {
    return null
  }
}

/** 读取字符串；不可用或不存在时返回 null。 */
export function readText(key: string): string | null {
  try {
    return getStore()?.getItem(key) ?? null
  } catch {
    return null
  }
}

/** 写入字符串；返回是否成功。 */
export function writeText(key: string, value: string): boolean {
  try {
    getStore()?.setItem(key, value)
    return true
  } catch {
    return false
  }
}

/** 删除键；返回是否成功。 */
export function removeKey(key: string): boolean {
  try {
    getStore()?.removeItem(key)
    return true
  } catch {
    return false
  }
}
