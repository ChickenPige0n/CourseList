import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

import {
  importCourseText,
  parseCoursesJson,
  serializeCourses,
  sortByStartTime,
  toDateKey,
  buildIcsCalendar,
  type Course,
  type DateInput,
} from '@/domain'
import { STORAGE_KEYS, readText, removeKey, writeText } from '@/infrastructure/storage'

export type CourseSource = 'empty' | 'storage' | 'import'

/**
 * 课程数据仓库：唯一的课程状态来源。
 *
 * 负责「读/写 localStorage」与「解析/序列化」，不涉及任何 UI 反馈；
 * 提示与下载由 `useCourseTransfer()` 组合。
 */
export const useCourseStore = defineStore('courses', () => {
  const courses = ref<Course[]>([])
  const warnings = ref<string[]>([])
  const source = ref<CourseSource>('empty')

  const count = computed(() => courses.value.length)
  const hasData = computed(() => courses.value.length > 0)

  /** 按本地日期键分组的索引，供周视图与日视图复用。 */
  const byDate = computed(() => {
    const map = new Map<string, Course[]>()
    for (const course of courses.value) {
      const key = toDateKey(course.startTime)
      const bucket = map.get(key)
      if (bucket) bucket.push(course)
      else map.set(key, [course])
    }
    return map
  })

  /** 某一天的课程（已按时间排序）。 */
  function coursesOn(date: DateInput): Course[] {
    return byDate.value.get(toDateKey(date)) ?? []
  }

  /** 某一天的课程数量，用于周条上的小圆点。 */
  function countOn(date: DateInput): number {
    return coursesOn(date).length
  }

  /** 应用一份课程列表：写入存储并替换当前状态。 */
  function replaceAll(next: readonly Course[]): boolean {
    const sorted = sortByStartTime(next)
    const persisted = writeText(STORAGE_KEYS.courses, serializeCourses(sorted))
    courses.value = sorted
    warnings.value = []
    source.value = 'import'
    return persisted
  }

  /** 从 localStorage 恢复（首次启动时调用）。 */
  function loadFromStorage(): void {
    const text = readText(STORAGE_KEYS.courses)
    if (!text) return

    try {
      const result = parseCoursesJson(text)
      courses.value = result.courses
      warnings.value = result.warnings
      source.value = 'storage'
    } catch (error) {
      warnings.value = [error instanceof Error ? error.message : '本地课程数据无法解析']
      source.value = 'empty'
    }
  }

  /** 解析任意文本（JSON / ICS），返回结果但不改变状态。 */
  function inspectText(text: string) {
    return importCourseText(text)
  }

  /** 清空课程数据（同时清理本地存储）。 */
  function clear(): void {
    removeKey(STORAGE_KEYS.courses)
    courses.value = []
    warnings.value = []
    source.value = 'empty'
  }

  /** 当前数据的 JSON 文本。 */
  function toJson(): string {
    return serializeCourses(courses.value)
  }

  /** 当前数据的 ICS 日历文本。 */
  function toIcs(): string {
    return buildIcsCalendar(courses.value)
  }

  return {
    courses,
    warnings,
    source,
    count,
    hasData,
    coursesOn,
    countOn,
    replaceAll,
    loadFromStorage,
    inspectText,
    clear,
    toJson,
    toIcs,
  }
})
