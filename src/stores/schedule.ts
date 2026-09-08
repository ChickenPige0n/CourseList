import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

import {
  addDays,
  addWeeks,
  courseDurationMinutes,
  daysOfWeek,
  formatWeekRange,
  isSameDay,
  isToday as isTodayDate,
  startOfDay,
  startOfWeek,
  toDateKey,
  WEEKDAY_NARROW,
  WEEKDAY_SHORT,
  type Course,
  type DateInput,
} from '@/domain'
import { useCourseStore } from '@/stores/courses'

export interface WeekDay {
  readonly date: Date
  readonly dateKey: string
  /** `周一` */
  readonly label: string
  /** `一` */
  readonly narrow: string
  readonly dayOfMonth: number
  readonly count: number
  readonly isSelected: boolean
  readonly isToday: boolean
}

export interface DaySummary {
  readonly count: number
  readonly firstStart: number | null
  readonly lastEnd: number | null
  readonly minutes: number
}

/**
 * 视图状态：当前选中的日期与派生出的周/日视图数据。
 *
 * 用 store 而不是 composable，保证头部导航、周条、课程列表
 * 共享同一份选中状态。
 */
export const useScheduleStore = defineStore('schedule', () => {
  const courseStore = useCourseStore()

  const selectedTimestamp = ref(startOfDay(new Date()).getTime())

  const selectedDate = computed(() => new Date(selectedTimestamp.value))
  const weekStart = computed(() => startOfWeek(selectedDate.value))
  const weekEnd = computed(() => addDays(weekStart.value, 6))

  const weekDays = computed<WeekDay[]>(() => {
    const now = new Date()
    const selected = selectedDate.value
    return daysOfWeek(weekStart.value).map((date) => ({
      date,
      dateKey: toDateKey(date),
      label: WEEKDAY_SHORT[date.getDay()] as string,
      narrow: WEEKDAY_NARROW[date.getDay()] as string,
      dayOfMonth: date.getDate(),
      count: courseStore.countOn(date),
      isSelected: isSameDay(date, selected),
      isToday: isTodayDate(date, now),
    }))
  })

  const weekLabel = computed(() => formatWeekRange(weekStart.value, weekEnd.value))
  const weekCount = computed(() => weekDays.value.reduce((sum, day) => sum + day.count, 0))
  const weekContainsToday = computed(() => {
    const now = new Date()
    return now >= weekStart.value && now < addWeeks(weekStart.value, 1)
  })

  const selectedCourses = computed<Course[]>(() => courseStore.coursesOn(selectedDate.value))

  const daySummary = computed<DaySummary>(() => {
    const list = selectedCourses.value
    if (list.length === 0) {
      return { count: 0, firstStart: null, lastEnd: null, minutes: 0 }
    }
    const first = list[0] as Course
    const last = list[list.length - 1] as Course
    return {
      count: list.length,
      firstStart: first.startTime,
      lastEnd: last.endTime,
      minutes: list.reduce((sum, course) => sum + courseDurationMinutes(course), 0),
    }
  })

  /** 选中某一天（自动跳转到所在周）。 */
  function select(date: DateInput): void {
    selectedTimestamp.value = startOfDay(date).getTime()
  }

  /** 按 `YYYY-MM-DD` 选中（供日期选择器使用）。 */
  function selectDateKey(key: string): boolean {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key.trim())
    if (!match) return false
    select(new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])))
    return true
  }

  /** 回到今天。 */
  function goToToday(now: Date = new Date()): void {
    select(now)
  }

  /** 上一周 / 下一周。 */
  function shiftWeek(delta: number): void {
    selectedTimestamp.value = addWeeks(selectedDate.value, delta).getTime()
  }

  /** 上一天 / 下一天（触摸滑动）。 */
  function shiftDay(delta: number): void {
    selectedTimestamp.value = addDays(selectedDate.value, delta).getTime()
  }

  const isTodaySelected = computed(() => isTodayDate(selectedDate.value, new Date()))

  return {
    selectedDate,
    weekStart,
    weekEnd,
    weekLabel,
    weekCount,
    weekContainsToday,
    weekDays,
    selectedCourses,
    daySummary,
    isTodaySelected,
    select,
    selectDateKey,
    goToToday,
    shiftWeek,
    shiftDay,
  }
})
