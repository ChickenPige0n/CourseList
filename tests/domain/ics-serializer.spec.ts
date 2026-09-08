import { describe, expect, it } from 'vitest'

import { normalizeCourse, type Course } from '@/domain/course'
import { parseIcs } from '@/domain/ics/parser'
import {
  buildCourseCalendar,
  buildIcsCalendar,
  calendarFileName,
  courseUid,
  escapeIcsText,
  foldIcsLine,
  icsFileName,
  toIcsLocalDateTime,
  toIcsUtcDateTime,
} from '@/domain/ics/serializer'

const STAMP = new Date(Date.UTC(2024, 8, 1, 12, 0, 0))

function makeCourse(overrides: Record<string, unknown> = {}): Course {
  return normalizeCourse({
    lessonName: '高等数学',
    teacherName: '张教授',
    classRoomName: '教学楼A101',
    startTime: new Date(2024, 8, 9, 8, 0).getTime(),
    endTime: new Date(2024, 8, 9, 9, 40).getTime(),
    ...overrides,
  })
}

/** 按 RFC 5545 解折行，便于断言原始值。 */
function unfold(text: string): string {
  return text.replace(/\r\n[ \t]/g, '')
}

describe('时间格式化', () => {
  it('本地浮动时间不带 Z', () => {
    expect(toIcsLocalDateTime(new Date(2024, 8, 9, 8, 5, 3))).toBe('20240909T080503')
  })

  it('UTC 时间带 Z', () => {
    expect(toIcsUtcDateTime(STAMP)).toBe('20240901T120000Z')
  })
})

describe('escapeIcsText', () => {
  it('转义反斜杠、逗号、分号与换行', () => {
    expect(escapeIcsText('a\\b,c;d\ne')).toBe('a\\\\b\\,c\\;d\\ne')
  })
})

describe('foldIcsLine', () => {
  it('短行原样返回', () => {
    expect(foldIcsLine('SUMMARY:数学')).toBe('SUMMARY:数学')
  })

  it('长行按 75 个八位组折行且不切断多字节字符', () => {
    const line = `DESCRIPTION:${'中文内容'.repeat(40)}`
    const folded = foldIcsLine(line)

    for (const part of folded.split('\r\n')) {
      expect(new TextEncoder().encode(part).length).toBeLessThanOrEqual(75)
    }
    expect(unfold(folded)).toBe(line)
  })
})

describe('courseUid', () => {
  it('同一门课同一时间保持稳定', () => {
    const course = makeCourse()
    expect(courseUid(course)).toBe(courseUid(makeCourse()))
    expect(courseUid(course)).toContain('@suat-courselist')
  })

  it('不同时间或地点生成不同 UID', () => {
    const base = makeCourse()
    const other = makeCourse({ classRoomName: '教学楼B202' })
    expect(courseUid(base)).not.toBe(courseUid(other))
  })
})

describe('buildIcsCalendar', () => {
  it('生成符合结构的 VCALENDAR，且使用 CRLF', () => {
    const text = buildIcsCalendar([makeCourse()], { stamp: STAMP })

    expect(text.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true)
    expect(text.trimEnd().endsWith('END:VCALENDAR')).toBe(true)
    expect(text).toContain('X-WR-CALNAME:SUAT课程表')
    expect(text).toContain('DTSTAMP:20240901T120000Z')
    expect(text).toContain('SUMMARY:高等数学')
    expect(text).toContain('LOCATION:教学楼A101')
    expect(text).toContain('DESCRIPTION:授课教师: 张教授')
    // 导出为浮动时间，不带 Z
    expect(text).toMatch(/DTSTART:\d{8}T\d{6}\r\n/)
  })

  it('可以自定义日历名', () => {
    const text = buildIcsCalendar([makeCourse()], { calendarName: '2024 秋', stamp: STAMP })
    expect(text).toContain('X-WR-CALNAME:2024 秋')
  })

  it('导出的内容能被解析器读回', () => {
    const courses = [makeCourse(), makeCourse({ lessonName: '大学英语', startTime: new Date(2024, 8, 10, 10, 0).getTime(), endTime: new Date(2024, 8, 10, 11, 40).getTime() })]
    const parsed = parseIcs(buildIcsCalendar(courses, { stamp: STAMP }))

    expect(parsed.events).toHaveLength(2)
    expect(parsed.events[0]?.start).toBe(courses[0]?.startTime)
    expect(parsed.events[1]?.summary).toBe('大学英语')
  })

  it('buildCourseCalendar 用课程名作为日历名', () => {
    const text = buildCourseCalendar(makeCourse(), { stamp: STAMP })
    expect(text).toContain('X-WR-CALNAME:高等数学')
    expect(text.match(/BEGIN:VEVENT/g)).toHaveLength(1)
  })
})

describe('文件名', () => {
  it('单课程文件名包含课程名与日期', () => {
    expect(icsFileName(makeCourse())).toBe('高等数学-9月9日.ics')
  })

  it('过滤文件系统非法字符', () => {
    const course = makeCourse({ lessonName: 'a/b:c*d?e"f<g>h|i' })
    expect(icsFileName(course)).toBe('a_b_c_d_e_f_g_h_i-9月9日.ics')
  })

  it('整表文件名带导出日期', () => {
    expect(calendarFileName(new Date(2024, 8, 1))).toBe('SUAT课程表-20240901.ics')
  })
})
