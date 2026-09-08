/**
 * 日期与周视图的纯函数工具。
 *
 * 全部函数都不读取系统时钟（需要「现在」时由调用方传入），
 * 因此可以在测试中稳定复现。
 */

/** 一周的起始日：0 = 周日（与教务课表习惯一致）。 */
export const WEEK_START_DAY = 0

export const WEEKDAY_SHORT = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'] as const
export const WEEKDAY_NARROW = ['日', '一', '二', '三', '四', '五', '六'] as const

export type DateInput = Date | number | string

/** 把任意输入转成 Date；非法输入抛错。 */
export function toDate(value: DateInput): Date {
  const date = value instanceof Date ? new Date(value.getTime()) : new Date(value)
  if (Number.isNaN(date.getTime())) throw new RangeError(`无法解析日期：${String(value)}`)
  return date
}

/** 当天 00:00（本地时区）。 */
export function startOfDay(value: DateInput): Date {
  const date = toDate(value)
  date.setHours(0, 0, 0, 0)
  return date
}

/** 所在周的起始日 00:00。 */
export function startOfWeek(value: DateInput, weekStartsOn: number = WEEK_START_DAY): Date {
  const date = startOfDay(value)
  const offset = (date.getDay() - weekStartsOn + 7) % 7
  date.setDate(date.getDate() - offset)
  return date
}

/** 增加天数（跨月/跨年安全）。 */
export function addDays(value: DateInput, days: number): Date {
  const date = toDate(value)
  date.setDate(date.getDate() + days)
  return date
}

/** 增加周数。 */
export function addWeeks(value: DateInput, weeks: number): Date {
  return addDays(value, weeks * 7)
}

/** 两个时刻是否同一天（本地时区）。 */
export function isSameDay(a: DateInput, b: DateInput): boolean {
  const left = toDate(a)
  const right = toDate(b)
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  )
}

/** 是否是「今天」。 */
export function isToday(value: DateInput, now: DateInput = new Date()): boolean {
  return isSameDay(value, now)
}

/** 周起始日之后的 7 天。 */
export function daysOfWeek(weekStart: DateInput, weekStartsOn: number = WEEK_START_DAY): Date[] {
  const start = startOfWeek(weekStart, weekStartsOn)
  return Array.from({ length: 7 }, (_, index) => addDays(start, index))
}

/** 本地日期键 `YYYY-MM-DD`，用作按天索引的分组键。 */
export function toDateKey(value: DateInput): string {
  const date = toDate(value)
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/** 解析 `YYYY-MM-DD`（或 `<input type="date">` 的值）；非法返回 null。 */
export function fromDateKey(key: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key.trim())
  if (!match) return null
  const [, year, month, day] = match
  const date = new Date(Number(year), Number(month) - 1, Number(day))
  return Number.isNaN(date.getTime()) ? null : date
}

/** `<time datetime>` 需要的本地时间格式 `YYYY-MM-DDTHH:mm`。 */
export function toLocalDateTimeValue(value: DateInput): string {
  const date = toDate(value)
  return `${toDateKey(date)}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

/** `9月9日` */
export function formatMonthDay(value: DateInput): string {
  const date = toDate(value)
  return `${date.getMonth() + 1}月${date.getDate()}日`
}

/** `9月9日 星期一` */
export function formatFullDate(value: DateInput): string {
  const date = toDate(value)
  return `${formatMonthDay(date)} ${WEEKDAY_SHORT[date.getDay()]}`
}

/** 相对今天的称呼：`今天` / `明天` / `昨天`，其余返回 null。 */
export function formatRelativeDay(value: DateInput, now: DateInput = new Date()): string | null {
  const diffDays = Math.round(
    (startOfDay(value).getTime() - startOfDay(now).getTime()) / 86_400_000,
  )
  if (diffDays === 0) return '今天'
  if (diffDays === 1) return '明天'
  if (diffDays === -1) return '昨天'
  return null
}

/** `08:00` */
export function formatTime(value: DateInput): string {
  const date = toDate(value)
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`
}

/** `9月9日 – 9月15日` */
export function formatWeekRange(start: DateInput, end: DateInput): string {
  return `${formatMonthDay(start)} – ${formatMonthDay(end)}`
}

/** 把分钟数格式化为「1.5 小时」/「40 分钟」。 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${Math.round(minutes)} 分钟`
  const hours = Math.round((minutes / 60) * 10) / 10
  return `${hours} 小时`
}

function pad(value: number): string {
  return String(value).padStart(2, '0')
}
