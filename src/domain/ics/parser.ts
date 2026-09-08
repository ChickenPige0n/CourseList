/**
 * ICS（RFC 5545）解析器。
 *
 * 兼容场景：
 *  - 教务课表油猴脚本导出的 UTC(Z) 时间；
 *  - 本应用导出的「本地浮动时间」ICS；
 *  - 带 `TZID=Asia/Shanghai` 或 `+0800` 偏移的日程；
 *  - `FREQ=WEEKLY` 重复日程（INTERVAL / BYDAY / COUNT / UNTIL / WKST）与 EXDATE 例外。
 *
 * 输出是纯数据；转换为课程实体的职责在 `toCourses()` 中，交给
 * `normalizeCourses()` 做最后校验。
 */

import { normalizeCourses, stripBom, type Course, type NormalizedCourses } from '@/domain/course'

export class IcsFormatError extends Error {
  override readonly name = 'IcsFormatError'
}

/** 展开后的单次日程。 */
export interface IcsOccurrence {
  readonly start: number
  readonly end: number
}

/** 解析得到的日程（重复日程已展开为多次 occurrence）。 */
export interface IcsEvent {
  readonly summary: string
  readonly location: string
  readonly description: string
  readonly uid: string
  readonly start: number
  readonly end: number
  readonly allDay: boolean
}

export interface IcsParseResult {
  readonly events: IcsEvent[]
  readonly calendarName: string
  readonly warnings: string[]
}

export interface IcsImportResult extends NormalizedCourses {
  readonly calendarName: string
  /** 兼容别名：`courses` 的旧命名。 */
  readonly list: Course[]
}

interface RawEvent {
  summary: string
  location: string
  description: string
  uid: string
  start: number
  end: number
  allDay: boolean
  rrule: string | null
  exdates: number[]
}

interface Prop {
  key: string
  params: Record<string, string>
  value: string
}

type DateTimeToken =
  | { dateOnly: true; y: number; mo: number; d: number }
  | { dateOnly: false; instant: number }

const WEEKDAY_INDEX: Record<string, number> = { SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6 }
const SHANGHAI_TZIDS = /^(ASIA\/SHANGHAI|ASIA\/CHONGQING|ASIA\/HARBIN|ASIA\/URUMQI|CHINA|CST|GMT\+8|UTC\+8|CN)$/

/** 单个重复日程的最大展开次数，防止恶意/异常规则拖垮页面。 */
const MAX_OCCURRENCES = 2_000
/** 重复日程的展开时间上限（天）。 */
const MAX_HORIZON_DAYS = 365 * 5
const DAY_MS = 86_400_000

/** 判断文本是否看起来像 ICS 日历。 */
export function looksLikeIcs(text: string): boolean {
  return /^\s*BEGIN\s*:\s*VCALENDAR/i.test(stripBom(text))
}

/** 展开 RFC 5545 的折行（续行以空格或制表符开头）。 */
function unfold(text: string): string[] {
  const lines = stripBom(text).replace(/\r\n?/g, '\n').split('\n')
  const out: string[] = []
  for (const line of lines) {
    if (/^[ \t]/.test(line) && out.length > 0) {
      out[out.length - 1] += line.slice(1)
    } else if (line.trim() !== '') {
      out.push(line)
    }
  }
  return out
}

function unescapeText(value: string): string {
  return value
    .replace(/\\n/gi, '\n')
    .replace(/\\,/g, ',')
    .replace(/\\;/g, ';')
    .replace(/\\\\/g, '\\')
}

function splitProp(line: string): Prop | null {
  const index = line.indexOf(':')
  if (index < 0) return null

  const head = line.slice(0, index)
  const [rawKey, ...rawParams] = head.split(';')
  const params: Record<string, string> = {}
  for (const part of rawParams) {
    const eq = part.indexOf('=')
    if (eq > 0) params[part.slice(0, eq).toUpperCase()] = part.slice(eq + 1)
  }
  return { key: (rawKey ?? '').trim().toUpperCase(), params, value: line.slice(index + 1) }
}

/** 解析 `YYYYMMDD` / `YYYYMMDDTHHMMSS(Z)` / 带偏移或 TZID 的时间值。 */
function parseDateTimeToken(raw: string, params: Record<string, string>): DateTimeToken {
  let token = raw.trim()
  let isUtc = false
  let offsetMinutes = 0

  if (/[zZ]$/.test(token)) {
    isUtc = true
    token = token.slice(0, -1)
  } else {
    const offsetMatch = /([+-])(\d{2})(\d{2})$/.exec(token)
    if (offsetMatch) {
      offsetMinutes =
        (offsetMatch[1] === '+' ? 1 : -1) * (Number(offsetMatch[2]) * 60 + Number(offsetMatch[3]))
      token = token.replace(/[+-]\d{4}$/, '')
    }
  }

  const dateOnly = /^(\d{4})(\d{2})(\d{2})$/.exec(token)
  if (dateOnly) {
    return {
      dateOnly: true,
      y: Number(dateOnly[1]),
      mo: Number(dateOnly[2]) - 1,
      d: Number(dateOnly[3]),
    }
  }

  const dateTime = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})?/.exec(token)
  if (!dateTime) throw new IcsFormatError(`无法识别的时间值：${raw}`)

  const [, y, mo, d, h, mi, s] = dateTime
  const year = Number(y)
  const month = Number(mo) - 1
  const day = Number(d)
  const hour = Number(h)
  const minute = Number(mi)
  const second = s ? Number(s) : 0

  const tzid = (params.TZID ?? '').toUpperCase()
  const isShanghai = SHANGHAI_TZIDS.test(tzid) || /^\+08:?00$/.test(params.TZID ?? '')

  if (isUtc || isShanghai || offsetMinutes !== 0) {
    let instant = Date.UTC(year, month, day, hour, minute, second) - offsetMinutes * 60_000
    if (isShanghai && !isUtc) instant -= 8 * 3_600_000
    return { dateOnly: false, instant }
  }

  // 浮动时间：按运行环境本地时区解释
  return { dateOnly: false, instant: new Date(year, month, day, hour, minute, second).getTime() }
}

/** 收集 VEVENT 正文中的属性（同名属性保留全部取值）。 */
function collectProps(lines: string[]): Map<string, Prop[]> {
  const map = new Map<string, Prop[]>()
  for (const line of lines) {
    const prop = splitProp(line)
    if (!prop) continue
    const bucket = map.get(prop.key)
    if (bucket) bucket.push(prop)
    else map.set(prop.key, [prop])
  }
  return map
}

function firstProp(map: Map<string, Prop[]>, key: string): Prop | null {
  return map.get(key)?.[0] ?? null
}

function resolveStart(token: DateTimeToken): number {
  return token.dateOnly ? new Date(token.y, token.mo, token.d).getTime() : token.instant
}

function parseUntil(raw: string): number {
  const token = parseDateTimeToken(raw, {})
  return token.dateOnly
    ? new Date(token.y, token.mo, token.d, 23, 59, 59, 999).getTime()
    : token.instant
}

function buildRawEvent(map: Map<string, Prop[]>): RawEvent | null {
  const startProp = firstProp(map, 'DTSTART')
  if (!startProp) return null

  const startToken = parseDateTimeToken(startProp.value, startProp.params)
  const start = resolveStart(startToken)

  const endProp = firstProp(map, 'DTEND')
  let end: number
  if (endProp) {
    const endToken = parseDateTimeToken(endProp.value, endProp.params)
    if (endToken.dateOnly) {
      end = new Date(endToken.y, endToken.mo, endToken.d).getTime()
      if (!startToken.dateOnly) end += DAY_MS - 1
    } else {
      end = endToken.instant
    }
  } else {
    end = startToken.dateOnly ? start + DAY_MS - 1 : start + 3_600_000
  }

  const summary = firstProp(map, 'SUMMARY')
  const location = firstProp(map, 'LOCATION')
  const description = firstProp(map, 'DESCRIPTION')
  const uid = firstProp(map, 'UID')
  const rrule = firstProp(map, 'RRULE')
  const exdates: number[] = []
  for (const prop of map.get('EXDATE') ?? []) {
    for (const value of prop.value.split(',')) {
      if (value.trim() === '') continue
      try {
        exdates.push(resolveStart(parseDateTimeToken(value, prop.params)))
      } catch {
        /* 单条例外时间无法解析时忽略 */
      }
    }
  }

  return {
    summary: summary ? unescapeText(summary.value).trim() : '',
    location: location ? unescapeText(location.value).trim() : '',
    description: description ? unescapeText(description.value).trim() : '',
    uid: uid ? uid.value.trim() : '',
    start,
    end,
    allDay: startToken.dateOnly,
    rrule: rrule ? rrule.value : null,
    exdates,
  }
}

interface WeeklyRule {
  interval: number
  byDay: number[]
  count: number | null
  until: number | null
  weekStartsOn: number
}

function parseWeeklyRule(rrule: string): WeeklyRule | null {
  const parts = new Map<string, string>()
  for (const chunk of rrule.split(';')) {
    const eq = chunk.indexOf('=')
    if (eq > 0) parts.set(chunk.slice(0, eq).toUpperCase(), chunk.slice(eq + 1).toUpperCase())
  }
  if (parts.get('FREQ') !== 'WEEKLY') return null

  const byDay = (parts.get('BYDAY') ?? '')
    .split(',')
    .map((day) => day.replace(/^[+-]?\d+/, ''))
    .filter((day) => WEEKDAY_INDEX[day] !== undefined)
    .map((day) => WEEKDAY_INDEX[day] as number)

  const interval = Math.max(1, Number.parseInt(parts.get('INTERVAL') ?? '1', 10) || 1)
  const countRaw = Number.parseInt(parts.get('COUNT') ?? '', 10)
  const untilRaw = parts.get('UNTIL')
  const weekStartsOn = WEEKDAY_INDEX[parts.get('WKST') ?? 'MO'] ?? 1

  return {
    interval,
    byDay,
    count: Number.isFinite(countRaw) && countRaw > 0 ? countRaw : null,
    until: untilRaw ? parseUntil(untilRaw) : null,
    weekStartsOn,
  }
}

/** 从周起始日算起的整周数。 */
function weekIndexBetween(weekStart: Date, date: Date, weekStartsOn: number): number {
  const start = startOfWeekLocal(weekStart, weekStartsOn)
  const target = startOfWeekLocal(date, weekStartsOn)
  return Math.round((target.getTime() - start.getTime()) / (7 * DAY_MS))
}

function startOfWeekLocal(value: Date, weekStartsOn: number): Date {
  const date = new Date(value.getFullYear(), value.getMonth(), value.getDate())
  const offset = (date.getDay() - weekStartsOn + 7) % 7
  date.setDate(date.getDate() - offset)
  return date
}

/**
 * 展开重复日程。非 WEEKLY 或规则缺失时返回单次 occurrence，
 * 并在无法完全展开时通过 `warnings` 说明。
 */
function expandOccurrences(event: RawEvent, warnings: string[]): IcsOccurrence[] {
  const single: IcsOccurrence[] = [{ start: event.start, end: event.end }]
  if (!event.rrule) return single

  let rule: WeeklyRule | null = null
  try {
    rule = parseWeeklyRule(event.rrule)
  } catch (error) {
    warnings.push(`重复规则无法解析，仅保留首次日程：${(error as Error).message}`)
    return single
  }
  if (!rule) {
    warnings.push(`暂不支持该重复规则（仅支持 FREQ=WEEKLY），仅保留首次日程`)
    return single
  }

  const dtStart = new Date(event.start)
  const duration = event.end - event.start
  const byDay = rule.byDay.length > 0 ? rule.byDay : [dtStart.getDay()]
  const byDaySet = new Set(byDay)
  const exdateSet = new Set(event.exdates)

  const anchor = startOfWeekLocal(dtStart, rule.weekStartsOn)
  const horizonEnd = Math.min(
    event.start + MAX_HORIZON_DAYS * DAY_MS,
    rule.until ?? Number.POSITIVE_INFINITY,
  )

  const occurrences: IcsOccurrence[] = []
  const cursor = new Date(anchor)
  let generated = 0
  let truncated = false

  while (cursor.getTime() <= horizonEnd) {
    const weekIndex = weekIndexBetween(anchor, cursor, rule.weekStartsOn)
    if (weekIndex % rule.interval === 0 && byDaySet.has(cursor.getDay())) {
      const instant = new Date(
        cursor.getFullYear(),
        cursor.getMonth(),
        cursor.getDate(),
        dtStart.getHours(),
        dtStart.getMinutes(),
        dtStart.getSeconds(),
        0,
      ).getTime()

      if (instant >= event.start) {
        // COUNT 按 RFC 5545 统计「生成」的次数，EXDATE 只负责剔除，不改变计数
        generated += 1
        if (!exdateSet.has(instant)) occurrences.push({ start: instant, end: instant + duration })
        if (rule.count !== null && generated >= rule.count) break
        if (occurrences.length >= MAX_OCCURRENCES) {
          truncated = true
          break
        }
      }
    }
    cursor.setDate(cursor.getDate() + 1)
  }

  if (truncated) {
    warnings.push(`重复日程超过 ${MAX_OCCURRENCES} 次，已截断`)
  }
  return occurrences.length > 0 ? occurrences : single
}

/** 解析整份 ICS 文本。 */
export function parseIcs(text: string): IcsParseResult {
  if (!looksLikeIcs(text)) {
    throw new IcsFormatError('内容不是有效的 ICS（缺少 BEGIN:VCALENDAR）')
  }

  const lines = unfold(text)
  const events: IcsEvent[] = []
  const warnings: string[] = []
  let calendarName = ''
  let index = 0

  while (index < lines.length) {
    const line = lines[index] as string
    const marker = /^(BEGIN|END)\s*:\s*([A-Z0-9-]+)/i.exec(line)

    if (!marker) {
      const calendarNameMatch = /^X-WR-CALNAME\s*:(.*)$/i.exec(line)
      if (calendarNameMatch) calendarName = (calendarNameMatch[1] ?? '').trim()
      index += 1
      continue
    }

    const isBegin = marker[1]?.toUpperCase() === 'BEGIN'
    const component = marker[2]?.toUpperCase()
    if (!isBegin || component !== 'VEVENT') {
      index += 1
      continue
    }

    // 收集 VEVENT 正文，忽略 VALARM 等嵌套组件
    const body: string[] = []
    let depth = 0
    let closed = false
    index += 1

    while (index < lines.length) {
      const inner = lines[index] as string
      const innerMarker = /^(BEGIN|END)\s*:\s*([A-Z0-9-]+)/i.exec(inner)

      if (innerMarker) {
        const innerBegin = innerMarker[1]?.toUpperCase() === 'BEGIN'
        const innerComponent = innerMarker[2]?.toUpperCase()
        if (!innerBegin && innerComponent === 'VEVENT' && depth === 0) {
          closed = true
          index += 1
          break
        }
        if (innerBegin) depth += 1
        else if (depth > 0) depth -= 1
        index += 1
        continue
      }

      if (depth === 0) body.push(inner)
      index += 1
    }

    if (!closed) break

    try {
      const raw = buildRawEvent(collectProps(body))
      if (raw) {
        for (const occurrence of expandOccurrences(raw, warnings)) {
          events.push({
            summary: raw.summary,
            location: raw.location,
            description: raw.description,
            uid: raw.uid,
            start: occurrence.start,
            end: occurrence.end,
            allDay: raw.allDay,
          })
        }
      }
    } catch (error) {
      warnings.push(`有一条日程无法解析：${(error as Error).message}`)
    }
  }

  if (events.length === 0) warnings.push('没有找到可导入的日程（VEVENT）')
  return { events, calendarName, warnings }
}

/** 从 DESCRIPTION 中提取授课教师。 */
export function extractTeacher(description: string): string | null {
  for (const line of description.split('\n')) {
    const match = /^\s*(?:授课教师|任课教师|教师|老师|teacher)\s*[:：]\s*(.+)$/i.exec(line)
    if (match?.[1]) return match[1].trim()
  }
  return null
}

/** 去掉教室前的「[校区]」前缀，保留建筑与教室号。 */
export function stripCampusPrefix(location: string): string {
  return location.replace(/^\s*\[[^\]\n]{0,30}\]\s*/, '').trim()
}

/** 把 ICS 文本转换为课程列表。 */
export function icsToCourses(text: string): IcsImportResult {
  const parsed = parseIcs(text)
  const rawList = parsed.events.map((event) => {
    const description = event.description
    const teacher = extractTeacher(description)
    const room = stripCampusPrefix(event.location)
    return {
      lessonName: event.summary || '未知课程',
      teacherName: teacher ?? '未知教师',
      classRoomName: room || '未知地点',
      startTime: event.start,
      endTime: event.end,
      ...(description ? { description } : {}),
    }
  })

  if (rawList.length === 0) {
    throw new IcsFormatError('ICS 中没有解析到日程数据（VEVENT）')
  }

  const normalized = normalizeCourses(rawList)
  return {
    ...normalized,
    list: normalized.courses,
    calendarName: parsed.calendarName,
    warnings: [...parsed.warnings, ...normalized.warnings],
  }
}
