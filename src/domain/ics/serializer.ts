/**
 * ICS 导出：把课程实体序列化为 RFC 5545 日历文本。
 *
 * 时间一律写成「本地浮动时间」（不带 Z / TZID），与教务课表语义一致：
 * 课程表描述的是当地墙上时间，导入到任何日历都保持原样。
 */

import type { Course } from '@/domain/course'
import { formatMonthDay } from '@/domain/calendar'

const PRODID = '-//SUAT Course List//EN'
const DEFAULT_CALENDAR_NAME = 'SUAT课程表'
const TIMEZONE = 'Asia/Shanghai'
const UID_DOMAIN = 'suat-courselist'
/** 折行长度（RFC 5545 要求不超过 75 个八位组）。 */
const FOLD_LIMIT = 73

export interface CalendarOptions {
  /** 日历名称（X-WR-CALNAME）。 */
  calendarName?: string
  /** DTSTAMP/CREATED 使用的时间，默认当前时刻（UTC）。 */
  stamp?: Date
}

function pad(value: number, length = 2): string {
  return String(value).padStart(length, '0')
}

/** 本地墙上时间 → `YYYYMMDDTHHMMSS`。 */
export function toIcsLocalDateTime(value: number | Date): string {
  const date = value instanceof Date ? value : new Date(value)
  return (
    `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}` +
    `T${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`
  )
}

/** UTC 时刻 → `YYYYMMDDTHHMMSSZ`。 */
export function toIcsUtcDateTime(value: number | Date): string {
  const date = value instanceof Date ? value : new Date(value)
  return (
    `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}` +
    `T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`
  )
}

/** 转义 ICS 文本值。 */
export function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r\n|\r|\n/g, '\\n')
}

/**
 * 按 75 个八位组折行，且不切开多字节字符或代理对。
 * 续行以一个空格开头。
 */
export function foldIcsLine(line: string): string {
  const encoder = new TextEncoder()
  if (encoder.encode(line).length <= 75) return line

  const chunks: string[] = []
  let current = ''
  let bytes = 0
  const limit = FOLD_LIMIT

  for (const char of line) {
    const size = encoder.encode(char).length
    if (bytes + size > limit) {
      chunks.push(current)
      current = ''
      bytes = 0
    }
    current += char
    bytes += size
  }
  if (current !== '') chunks.push(current)

  return chunks.join('\r\n ')
}

/** 生成课程事件的 UID（同一门课同一时间保持稳定）。 */
export function courseUid(course: Course): string {
  const seed = `${course.lessonName}-${course.startTime}-${course.classRoomName}`
  let hash = 5381
  for (let i = 0; i < seed.length; i += 1) {
    hash = ((hash << 5) + hash + seed.charCodeAt(i)) >>> 0
  }
  return `${course.lessonName}-${course.startTime}-${hash.toString(16)}@${UID_DOMAIN}`
}

function buildEventLines(course: Course, stamp: string): string[] {
  const descriptionParts = [`授课教师: ${course.teacherName}`]
  if (course.description) descriptionParts.push(course.description)

  return [
    'BEGIN:VEVENT',
    `UID:${courseUid(course)}`,
    `DTSTAMP:${stamp}`,
    `CREATED:${stamp}`,
    `DTSTART:${toIcsLocalDateTime(course.startTime)}`,
    `DTEND:${toIcsLocalDateTime(course.endTime)}`,
    `SUMMARY:${escapeIcsText(course.lessonName)}`,
    `LOCATION:${escapeIcsText(course.classRoomName)}`,
    `DESCRIPTION:${escapeIcsText(descriptionParts.join('\n'))}`,
    'STATUS:CONFIRMED',
    'END:VEVENT',
  ]
}

/** 生成一份完整的 VCALENDAR 文本。 */
export function buildIcsCalendar(
  courses: readonly Course[],
  options: CalendarOptions = {},
): string {
  const stamp = toIcsUtcDateTime(options.stamp ?? new Date())
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:${PRODID}`,
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeIcsText(options.calendarName ?? DEFAULT_CALENDAR_NAME)}`,
    `X-WR-TIMEZONE:${TIMEZONE}`,
    ...courses.flatMap((course) => buildEventLines(course, stamp)),
    'END:VCALENDAR',
  ]

  return `${lines.map(foldIcsLine).join('\r\n')}\r\n`
}

/** 单门课程的日历（详情弹窗里的「导出为 ICS」）。 */
export function buildCourseCalendar(course: Course, options: CalendarOptions = {}): string {
  return buildIcsCalendar([course], { calendarName: course.lessonName, ...options })
}

/** 生成安全的下载文件名。 */
export function icsFileName(course: Course): string {
  const safeName = course.lessonName.replace(/[\\/:*?"<>|]/g, '_').slice(0, 60)
  return `${safeName}-${formatMonthDay(course.startTime)}.ics`
}

/** 整份课表导出的文件名。 */
export function calendarFileName(stamp: Date = new Date()): string {
  return `SUAT课程表-${stamp.getFullYear()}${pad(stamp.getMonth() + 1)}${pad(stamp.getDate())}.ics`
}
