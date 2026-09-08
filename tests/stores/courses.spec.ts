// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import { STORAGE_KEYS } from '@/infrastructure/storage'
import { useCourseStore } from '@/stores/courses'
import { normalizeCourse, serializeCourses, type Course } from '@/domain'

function course(overrides: Record<string, unknown> = {}): Course {
  return normalizeCourse({
    lessonName: '高等数学',
    teacherName: '张教授',
    classRoomName: '教学楼A101',
    startTime: new Date(2024, 8, 9, 8, 0).getTime(),
    endTime: new Date(2024, 8, 9, 9, 40).getTime(),
    ...overrides,
  })
}

describe('useCourseStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
  })

  it('replaceAll 写入 localStorage 并更新状态', () => {
    const store = useCourseStore()
    expect(store.hasData).toBe(false)

    const persisted = store.replaceAll([course()])

    expect(persisted).toBe(true)
    expect(store.count).toBe(1)
    expect(store.hasData).toBe(true)
    expect(localStorage.getItem(STORAGE_KEYS.courses)).toContain('高等数学')
  })

  it('loadFromStorage 恢复历史数据', () => {
    localStorage.setItem(STORAGE_KEYS.courses, serializeCourses([course()]))
    const store = useCourseStore()

    store.loadFromStorage()

    expect(store.count).toBe(1)
    expect(store.source).toBe('storage')
    expect(store.courses[0]?.lessonName).toBe('高等数学')
  })

  it('本地数据损坏时记录警告且不崩溃', () => {
    localStorage.setItem(STORAGE_KEYS.courses, '{ 坏数据')
    const store = useCourseStore()

    store.loadFromStorage()

    expect(store.count).toBe(0)
    expect(store.warnings.join('')).toMatch(/JSON 语法错误/)
  })

  it('按日期索引课程', () => {
    const store = useCourseStore()
    const monday = new Date(2024, 8, 9, 8, 0)
    const tuesday = new Date(2024, 8, 10, 10, 0)

    store.replaceAll([
      course({ startTime: tuesday.getTime(), endTime: tuesday.getTime() + 3_600_000 }),
      course(),
    ])

    expect(store.countOn(monday)).toBe(1)
    expect(store.countOn(tuesday)).toBe(1)
    expect(store.countOn(new Date(2024, 8, 11))).toBe(0)
    expect(store.coursesOn(monday)[0]?.lessonName).toBe('高等数学')
  })

  it('clear 清空状态与存储', () => {
    const store = useCourseStore()
    store.replaceAll([course()])

    store.clear()

    expect(store.count).toBe(0)
    expect(store.hasData).toBe(false)
    expect(localStorage.getItem(STORAGE_KEYS.courses)).toBeNull()
  })

  it('toIcs / toJson 输出可再次解析的内容', () => {
    const store = useCourseStore()
    store.replaceAll([course()])

    expect(store.toIcs()).toContain('SUMMARY:高等数学')
    expect(JSON.parse(store.toJson()).data.list).toHaveLength(1)
  })

  it('inspectText 只解析不改变状态', () => {
    const store = useCourseStore()
    const result = store.inspectText(serializeCourses([course()]))

    expect(result.courses).toHaveLength(1)
    expect(store.count).toBe(0)
  })
})
