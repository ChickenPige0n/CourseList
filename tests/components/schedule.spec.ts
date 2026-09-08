// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia, type Pinia } from 'pinia'

import { normalizeCourse, startOfDay } from '@/domain'
import { useCourseStore } from '@/stores/courses'
import { useScheduleStore } from '@/stores/schedule'
import DaySchedule from '@/components/schedule/DaySchedule.vue'
import WeekStrip from '@/components/schedule/WeekStrip.vue'

const TODAY_8AM = startOfDay(new Date()).getTime() + 8 * 3_600_000

let pinia: Pinia

function todayCourse(overrides: Record<string, unknown> = {}) {
  return normalizeCourse({
    lessonName: '高等数学',
    teacherName: '张教授',
    classRoomName: '教学楼A101',
    startTime: TODAY_8AM,
    endTime: TODAY_8AM + 100 * 60_000,
    ...overrides,
  })
}

function mountWithPinia(component: Parameters<typeof mount>[0]) {
  return mount(component, { global: { plugins: [pinia] } })
}

beforeEach(() => {
  pinia = createPinia()
  setActivePinia(pinia)
  localStorage.clear()
})

describe('DaySchedule', () => {
  it('没有数据时展示导入引导', () => {
    const wrapper = mountWithPinia(DaySchedule)

    expect(wrapper.text()).toContain('今天没有课程')
    expect(wrapper.text()).toContain('导入教务系统导出的 ICS 课表')
    expect(wrapper.find('button').text()).toContain('导入课表')
  })

  it('渲染当天课程并统计时长', () => {
    useCourseStore().replaceAll([todayCourse()])
    const wrapper = mountWithPinia(DaySchedule)

    expect(wrapper.findAll('article')).toHaveLength(1)
    expect(wrapper.text()).toContain('高等数学')
    expect(wrapper.text()).toContain('张教授')
    expect(wrapper.text()).toContain('1 门课程')
    expect(wrapper.text()).toContain('1.7 小时')
  })

  it('点击课程卡片派发 select 事件', async () => {
    useCourseStore().replaceAll([todayCourse()])
    const wrapper = mountWithPinia(DaySchedule)

    await wrapper.find('.course-open').trigger('click')

    const emitted = wrapper.emitted('select')
    expect(emitted).toHaveLength(1)
    expect((emitted?.[0]?.[0] as { lessonName: string }).lessonName).toBe('高等数学')
  })

  it('有数据但没有课程的日子给出换一天提示', () => {
    useCourseStore().replaceAll([todayCourse()])
    useScheduleStore().shiftDay(1)
    const wrapper = mountWithPinia(DaySchedule)

    expect(wrapper.text()).toContain('这天没有课程')
    expect(wrapper.text()).toContain('换一天看看')
  })
})

describe('WeekStrip', () => {
  it('渲染 7 天并标注选中与课程数', () => {
    useCourseStore().replaceAll([todayCourse()])
    const wrapper = mountWithPinia(WeekStrip)

    expect(wrapper.findAll('.week-day')).toHaveLength(7)
    expect(wrapper.findAll('[aria-current="date"]')).toHaveLength(1)
    expect(wrapper.findAll('.week-day-dots i')).toHaveLength(1)
    expect(wrapper.text()).toContain('1 门课程')
  })

  it('点击某天切换选中日期', async () => {
    const wrapper = mountWithPinia(WeekStrip)
    const schedule = useScheduleStore()
    const before = schedule.selectedDate.getTime()

    await wrapper.findAll('.week-day')[0]?.trigger('click')

    expect(schedule.selectedDate.getTime()).not.toBe(before)
  })
})
