/**
 * 导入入口：自动识别 JSON / ICS 文本，统一输出规范化的课程列表。
 *
 * 展示层只需要调用 `importCourseText()`，不必关心来源格式。
 */

import { parseCoursesJson, serializeCourses, type NormalizedCourses } from '@/domain/course'
import { icsToCourses, looksLikeIcs } from '@/domain/ics/parser'

export type CourseTextFormat = 'ics' | 'json'

export interface CourseImportResult extends NormalizedCourses {
  readonly format: CourseTextFormat
  /** ICS 中的日历名（X-WR-CALNAME），JSON 导入时为空。 */
  readonly calendarName: string
  /** 规范化后的 JSON 文本，便于回填到编辑器。 */
  readonly jsonText: string
}

/** 识别文本格式：以 BEGIN:VCALENDAR 开头视为 ICS，其余按 JSON 处理。 */
export function detectFormat(text: string): CourseTextFormat {
  return looksLikeIcs(text) ? 'ics' : 'json'
}

/** 解析并规范化课程文本。 */
export function importCourseText(text: string): CourseImportResult {
  if (detectFormat(text) === 'ics') {
    const result = icsToCourses(text)
    return {
      format: 'ics',
      courses: result.courses,
      warnings: result.warnings,
      calendarName: result.calendarName,
      jsonText: serializeCourses(result.courses),
    }
  }

  const result = parseCoursesJson(text)
  return {
    format: 'json',
    courses: result.courses,
    warnings: result.warnings,
    calendarName: '',
    jsonText: serializeCourses(result.courses),
  }
}
