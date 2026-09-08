/**
 * 课程领域模型。
 *
 * 这一层是纯 TypeScript，不依赖 Vue / DOM / 浏览器 API：
 * 任何数据源（JSON 文本、ICS 文件、localStorage）都必须先经过
 * `normalizeCourses()` 才能进入应用状态，从而保证上层拿到的
 * 永远是结构合法、时间有序的 `Course` 列表。
 */

/** 应用内规范化的课程实体。 */
export interface Course {
  /** 稳定标识：同名课程的不同场次不会互相覆盖。 */
  readonly id: string
  readonly lessonName: string
  readonly teacherName: string
  readonly classRoomName: string
  /** 起始时刻（epoch 毫秒，本地时区语义）。 */
  readonly startTime: number
  /** 结束时刻（epoch 毫秒）。 */
  readonly endTime: number
  /** 原始描述（通常来自 ICS 的 DESCRIPTION）。 */
  readonly description?: string
  /** 教务系统给出的课程色，用于时间轴节点。 */
  readonly tagcolour?: string
}

/** 相对当前时刻的课程状态。 */
export type CourseStatus = 'current' | 'upcoming' | 'past'

/** 规范化结果：课程列表 + 非致命提示。 */
export interface NormalizedCourses {
  readonly courses: Course[]
  readonly warnings: string[]
}

/** 输入数据无法解析为课程列表时抛出。 */
export class CourseFormatError extends Error {
  override readonly name = 'CourseFormatError'
}

export const UNKNOWN_LESSON = '未知课程'
export const UNKNOWN_TEACHER = '未知教师'
export const UNKNOWN_ROOM = '未知地点'

const SUPPORTED_SHAPES =
  '支持的形式：课程数组、{ data: [...] }、{ data: { list: [...] } }、{ list: [...] }'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function asNonEmptyString(value: unknown): string | null {
  if (typeof value === 'string' && value.trim() !== '') return value.trim()
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  return null
}

/** 解析时间字段：接受 epoch 毫秒、ISO 字符串、Date 实例。 */
function toTimestamp(value: unknown): number | null {
  if (value instanceof Date) {
    const ms = value.getTime()
    return Number.isFinite(ms) ? ms : null
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return null
    // 兼容以「秒」为单位的 Unix 时间戳
    return value > 0 && value < 1e11 ? value * 1000 : value
  }
  if (typeof value === 'string' && value.trim() !== '') {
    const ms = new Date(value.trim()).getTime()
    return Number.isFinite(ms) ? ms : null
  }
  return null
}

/** 由课程关键字段派生稳定 id。 */
export function createCourseId(input: {
  lessonName: string
  startTime: number
  classRoomName: string
}): string {
  return `${input.lessonName}@${input.startTime}#${input.classRoomName}`
}

/**
 * 把任意来源的单条记录规范化为 `Course`。
 * @throws {CourseFormatError} 时间缺失/非法，或课程名为空。
 */
export function normalizeCourse(raw: unknown, index = 0): Course {
  const position = `第 ${index + 1} 条`
  if (!isRecord(raw)) {
    throw new CourseFormatError(`${position}课程数据不是对象`)
  }

  const startTime = toTimestamp(raw.startTime)
  const endTime = toTimestamp(raw.endTime)
  if (startTime === null) throw new CourseFormatError(`${position}课程的 startTime 缺失或无法解析`)
  if (endTime === null) throw new CourseFormatError(`${position}课程的 endTime 缺失或无法解析`)
  if (endTime < startTime) throw new CourseFormatError(`${position}课程的结束时间早于开始时间`)

  const lessonName = asNonEmptyString(raw.lessonName) ?? ''
  if (lessonName === '') {
    throw new CourseFormatError(`${position}课程缺少 lessonName（课程名称）`)
  }

  const teacherName = asNonEmptyString(raw.teacherName) ?? UNKNOWN_TEACHER
  const classRoomName = asNonEmptyString(raw.classRoomName) ?? UNKNOWN_ROOM
  const description = asNonEmptyString(raw.description)
  const tagcolour = asNonEmptyString(raw.tagcolour)

  return {
    id: createCourseId({ lessonName, startTime, classRoomName }),
    lessonName,
    teacherName,
    classRoomName,
    startTime,
    endTime,
    ...(description === null ? {} : { description }),
    ...(tagcolour === null ? {} : { tagcolour }),
  }
}

/** 从各种历史/教务数据形状中取出课程数组。 */
export function extractCourseArray(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload

  if (isRecord(payload)) {
    const data = payload.data
    if (Array.isArray(data)) return data
    if (isRecord(data) && Array.isArray(data.list)) return data.list
    if (Array.isArray(payload.list)) return payload.list
  }

  throw new CourseFormatError(`无法识别的课程数据结构。${SUPPORTED_SHAPES}`)
}

/**
 * 规范化整份课程数据。
 * 单条数据损坏不会导致整体失败，而是被跳过并记入 `warnings`。
 */
export function normalizeCourses(payload: unknown): NormalizedCourses {
  const rawList = extractCourseArray(payload)
  const courses: Course[] = []
  const warnings: string[] = []
  const seen = new Set<string>()

  rawList.forEach((raw, index) => {
    try {
      const course = normalizeCourse(raw, index)
      if (seen.has(course.id)) {
        warnings.push(`第 ${index + 1} 条课程与已有记录重复，已忽略`)
        return
      }
      seen.add(course.id)
      courses.push(course)
    } catch (error) {
      warnings.push(error instanceof Error ? error.message : `第 ${index + 1} 条课程无法解析`)
    }
  })

  if (courses.length === 0) {
    throw new CourseFormatError(
      warnings[0] ?? `没有解析到任何课程。${SUPPORTED_SHAPES}`,
    )
  }

  return { courses: sortByStartTime(courses), warnings }
}

/** 解析 JSON 文本并规范化。 */
export function parseCoursesJson(text: string): NormalizedCourses {
  const trimmed = stripBom(text).trim()
  if (trimmed === '') throw new CourseFormatError('内容为空')

  let payload: unknown
  try {
    payload = JSON.parse(trimmed)
  } catch (error) {
    throw new CourseFormatError(`JSON 语法错误：${(error as Error).message}`)
  }
  return normalizeCourses(payload)
}

/** 序列化为本应用约定的 JSON 结构（`{ data: { list: [...] } }`）。 */
export function serializeCourses(courses: readonly Course[]): string {
  const list = sortByStartTime(courses).map((course) => ({
    lessonName: course.lessonName,
    teacherName: course.teacherName,
    classRoomName: course.classRoomName,
    startTime: course.startTime,
    endTime: course.endTime,
    ...(course.description === undefined ? {} : { description: course.description }),
    ...(course.tagcolour === undefined ? {} : { tagcolour: course.tagcolour }),
  }))
  return JSON.stringify({ data: { list } }, null, 2)
}

/** 按开始时间升序排序（返回新数组）。 */
export function sortByStartTime(courses: readonly Course[]): Course[] {
  return [...courses].sort((a, b) => a.startTime - b.startTime || a.endTime - b.endTime)
}

/** 课程相对 `now` 的状态；与所在日期无关，展示层再决定是否标注。 */
export function courseStatus(course: Course, now: number = Date.now()): CourseStatus {
  if (now > course.endTime) return 'past'
  if (now < course.startTime) return 'upcoming'
  return 'current'
}

/** 课程时长（分钟）。 */
export function courseDurationMinutes(course: Course): number {
  return Math.max(0, (course.endTime - course.startTime) / 60_000)
}

/** 去掉 UTF-8 BOM。 */
export function stripBom(text: string): string {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text
}
