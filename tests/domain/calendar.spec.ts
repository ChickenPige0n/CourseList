import { describe, expect, it } from 'vitest'

import {
  addDays,
  addWeeks,
  daysOfWeek,
  formatDuration,
  formatFullDate,
  formatMonthDay,
  formatRelativeDay,
  formatTime,
  formatWeekRange,
  fromDateKey,
  isSameDay,
  isToday,
  startOfDay,
  startOfWeek,
  toDateKey,
  toLocalDateTimeValue,
} from '@/domain/calendar'

describe('calendar', () => {
  it('以周日为起点计算周起始日', () => {
    // 2024-09-11 是星期三
    const wednesday = new Date(2024, 8, 11, 15, 30)
    expect(toDateKey(startOfWeek(wednesday))).toBe('2024-09-08')
    // 周日当天应返回自身
    expect(toDateKey(startOfWeek(new Date(2024, 8, 8)))).toBe('2024-09-08')
    // 周六属于同一周
    expect(toDateKey(startOfWeek(new Date(2024, 8, 14)))).toBe('2024-09-08')
  })

  it('startOfDay 清空时间部分', () => {
    const date = startOfDay(new Date(2024, 8, 11, 23, 59, 59, 999))
    expect([date.getHours(), date.getMinutes(), date.getSeconds(), date.getMilliseconds()]).toEqual([
      0, 0, 0, 0,
    ])
  })

  it('addDays 跨月与跨年都正确', () => {
    expect(toDateKey(addDays(new Date(2024, 8, 30), 2))).toBe('2024-10-02')
    expect(toDateKey(addDays(new Date(2024, 11, 31), 1))).toBe('2025-01-01')
    expect(toDateKey(addWeeks(new Date(2024, 8, 11), -1))).toBe('2024-09-04')
  })

  it('daysOfWeek 返回连续 7 天', () => {
    const days = daysOfWeek(new Date(2024, 8, 11))
    expect(days).toHaveLength(7)
    expect(days.map(toDateKey)).toEqual([
      '2024-09-08',
      '2024-09-09',
      '2024-09-10',
      '2024-09-11',
      '2024-09-12',
      '2024-09-13',
      '2024-09-14',
    ])
  })

  it('isSameDay / isToday 忽略时间部分', () => {
    const now = new Date(2024, 8, 11, 8, 0)
    expect(isSameDay(new Date(2024, 8, 11, 23, 0), now)).toBe(true)
    expect(isSameDay(new Date(2024, 8, 12, 0, 0), now)).toBe(false)
    expect(isToday(new Date(2024, 8, 11, 21, 30), now)).toBe(true)
    expect(isToday(new Date(2024, 8, 10), now)).toBe(false)
  })

  it('日期键可以双向转换', () => {
    expect(toDateKey(new Date(2024, 0, 5))).toBe('2024-01-05')
    expect(toDateKey(fromDateKey('2024-01-05') as Date)).toBe('2024-01-05')
    expect(fromDateKey('2024/01/05')).toBeNull()
    expect(fromDateKey('')).toBeNull()
  })

  it('格式化函数输出中文标签', () => {
    const date = new Date(2024, 8, 9, 8, 5)
    expect(formatMonthDay(date)).toBe('9月9日')
    expect(formatFullDate(date)).toBe('9月9日 周一')
    expect(formatTime(date)).toBe('08:05')
    expect(formatWeekRange(new Date(2024, 8, 9), new Date(2024, 8, 15))).toBe('9月9日 – 9月15日')
    expect(toLocalDateTimeValue(date)).toBe('2024-09-09T08:05')
  })

  it('时长格式化区分小时与分钟', () => {
    expect(formatDuration(45)).toBe('45 分钟')
    expect(formatDuration(90)).toBe('1.5 小时')
  })

  it('相对日期只对今天前后一天给称呼', () => {
    const now = new Date(2024, 8, 11, 9, 0)
    expect(formatRelativeDay(new Date(2024, 8, 11, 23, 30), now)).toBe('今天')
    expect(formatRelativeDay(new Date(2024, 8, 12), now)).toBe('明天')
    expect(formatRelativeDay(new Date(2024, 8, 10, 23, 59), now)).toBe('昨天')
    expect(formatRelativeDay(new Date(2024, 8, 13), now)).toBeNull()
    expect(formatRelativeDay(new Date(2024, 7, 31), now)).toBeNull()
  })
})
