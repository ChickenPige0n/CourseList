import { describe, expect, it } from 'vitest'

import {
  CourseFormatError,
  courseStatus,
  extractCourseArray,
  normalizeCourse,
  normalizeCourses,
  parseCoursesJson,
  serializeCourses,
  sortByStartTime,
  type Course,
} from '@/domain/course'

const MONDAY_8 = new Date(2024, 8, 9, 8, 0).getTime()
const MONDAY_9_40 = new Date(2024, 8, 9, 9, 40).getTime()
const MONDAY_10 = new Date(2024, 8, 9, 10, 0).getTime()

function rawCourse(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    lessonName: '高等数学',
    teacherName: '张教授',
    classRoomName: '教学楼A101',
    startTime: MONDAY_8,
    endTime: MONDAY_9_40,
    ...overrides,
  }
}

describe('normalizeCourse', () => {
  it('补齐缺失的教师与教室', () => {
    const course = normalizeCourse({ lessonName: '体育', startTime: MONDAY_8, endTime: MONDAY_10 })
    expect(course.teacherName).toBe('未知教师')
    expect(course.classRoomName).toBe('未知地点')
  })

  it('接受 ISO 字符串与 Date 时间', () => {
    const fromIso = normalizeCourse({
      lessonName: '英语',
      startTime: '2024-09-09T08:00:00',
      endTime: '2024-09-09T09:40:00',
    })
    const fromDate = normalizeCourse({
      lessonName: '英语',
      startTime: new Date(MONDAY_8),
      endTime: new Date(MONDAY_9_40),
    })
    expect(fromIso.startTime).toBe(MONDAY_8)
    expect(fromDate.endTime).toBe(MONDAY_9_40)
  })

  it('缺少课程名或时间时抛出 CourseFormatError', () => {
    expect(() => normalizeCourse({ startTime: MONDAY_8, endTime: MONDAY_10 })).toThrow(
      CourseFormatError,
    )
    expect(() => normalizeCourse({ lessonName: '数学' })).toThrow(/startTime/)
    expect(() =>
      normalizeCourse({ lessonName: '数学', startTime: MONDAY_10, endTime: MONDAY_8 }),
    ).toThrow(/结束时间早于开始时间/)
  })

  it('id 由课程名、开始时间与教室派生', () => {
    const course = normalizeCourse(rawCourse())
    expect(course.id).toBe(`高等数学@${MONDAY_8}#教学楼A101`)
  })
})

describe('extractCourseArray', () => {
  it('支持四种历史数据结构', () => {
    const list = [rawCourse()]
    expect(extractCourseArray(list)).toHaveLength(1)
    expect(extractCourseArray({ data: list })).toHaveLength(1)
    expect(extractCourseArray({ data: { list } })).toHaveLength(1)
    expect(extractCourseArray({ list })).toHaveLength(1)
  })

  it('无法识别时给出可读错误', () => {
    expect(() => extractCourseArray({ foo: 1 })).toThrow(CourseFormatError)
    expect(() => extractCourseArray(null)).toThrow(/无法识别的课程数据结构/)
  })
})

describe('normalizeCourses', () => {
  it('跳过损坏记录并给出警告', () => {
    const result = normalizeCourses([
      rawCourse(),
      { lessonName: '坏数据' },
      null,
      rawCourse({ lessonName: '大学物理', startTime: MONDAY_10, endTime: MONDAY_10 + 3_600_000 }),
    ])

    expect(result.courses.map((course) => course.lessonName)).toEqual(['高等数学', '大学物理'])
    expect(result.warnings).toHaveLength(2)
  })

  it('按开始时间排序并去重', () => {
    const late = rawCourse({ lessonName: '晚课', startTime: MONDAY_10, endTime: MONDAY_10 + 3_600_000 })
    const result = normalizeCourses({ data: { list: [late, rawCourse(), rawCourse()] } })

    expect(result.courses[0]?.lessonName).toBe('高等数学')
    expect(result.courses).toHaveLength(2)
    expect(result.warnings[0]).toMatch(/重复/)
  })

  it('没有任何有效课程时抛出', () => {
    expect(() => normalizeCourses([])).toThrow(CourseFormatError)
    expect(() => normalizeCourses([{ foo: 'bar' }])).toThrow(/第 1 条课程/)
  })
})

describe('JSON 往返', () => {
  it('serializeCourses 保留可选字段并可再次解析', () => {
    const original = normalizeCourses([
      rawCourse({ description: '微积分基础', tagcolour: '#ff0000' }),
    ]).courses

    const text = serializeCourses(original)
    expect(text).toContain('"description": "微积分基础"')

    const reparsed = parseCoursesJson(text)
    expect(reparsed.courses).toEqual(original)
  })

  it('parseCoursesJson 报告 JSON 语法错误', () => {
    expect(() => parseCoursesJson('{')).toThrow(/JSON 语法错误/)
    expect(() => parseCoursesJson('   ')).toThrow(/内容为空/)
  })
})

describe('sortByStartTime / courseStatus', () => {
  it('排序不改变原数组', () => {
    const input: Course[] = [
      normalizeCourse(rawCourse({ startTime: MONDAY_10, endTime: MONDAY_10 + 3_600_000 })),
      normalizeCourse(rawCourse()),
    ]
    const sorted = sortByStartTime(input)
    expect(sorted[0]?.startTime).toBe(MONDAY_8)
    expect(input[0]?.startTime).toBe(MONDAY_10)
  })

  it('根据当前时刻判断课程状态', () => {
    const course = normalizeCourse(rawCourse())
    expect(courseStatus(course, MONDAY_8 - 60_000)).toBe('upcoming')
    expect(courseStatus(course, MONDAY_8 + 60_000)).toBe('current')
    expect(courseStatus(course, MONDAY_9_40 + 60_000)).toBe('past')
  })
})
