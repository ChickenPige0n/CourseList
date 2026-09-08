import { describe, expect, it } from 'vitest'

import { addDays, toDateKey } from '@/domain/calendar'
import { IcsFormatError, extractTeacher, icsToCourses, looksLikeIcs, parseIcs, stripCampusPrefix } from '@/domain/ics/parser'

function wrap(vevent: string, extra = ''): string {
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'X-WR-CALNAME:测试课表',
    extra,
    'BEGIN:VEVENT',
    vevent,
    'END:VEVENT',
    'END:VCALENDAR',
  ]
    .filter(Boolean)
    .join('\r\n')
}

describe('looksLikeIcs', () => {
  it('识别带 BOM 与空白的 ICS 文本', () => {
    expect(looksLikeIcs('\uFEFF  BEGIN:VCALENDAR\r\n')).toBe(true)
    expect(looksLikeIcs('{"data":[]}')).toBe(false)
    expect(looksLikeIcs('')).toBe(false)
  })
})

describe('parseIcs 时间解析', () => {
  it('UTC(Z) 时间解析为固定时刻', () => {
    const result = parseIcs(wrap('UID:1\r\nSUMMARY:高等数学\r\nDTSTART:20240909T080000Z\r\nDTEND:20240909T094000Z'))
    expect(result.events[0]?.start).toBe(Date.UTC(2024, 8, 9, 8, 0, 0))
    expect(result.events[0]?.end).toBe(Date.UTC(2024, 8, 9, 9, 40, 0))
    expect(result.calendarName).toBe('测试课表')
  })

  it('TZID=Asia/Shanghai 按 UTC+8 换算', () => {
    const result = parseIcs(
      wrap('UID:1\r\nSUMMARY:英语\r\nDTSTART;TZID=Asia/Shanghai:20240909T140000\r\nDTEND;TZID=Asia/Shanghai:20240909T154000'),
    )
    expect(result.events[0]?.start).toBe(Date.UTC(2024, 8, 9, 6, 0, 0))
  })

  it('带偏移量的时间按偏移换算', () => {
    const result = parseIcs(wrap('UID:1\r\nSUMMARY:体育\r\nDTSTART:20240909T080000+0800\r\nDTEND:20240909T094000+0800'))
    expect(result.events[0]?.start).toBe(Date.UTC(2024, 8, 9, 0, 0, 0))
  })

  it('浮动时间按本地时区解释', () => {
    const result = parseIcs(wrap('UID:1\r\nSUMMARY:物理\r\nDTSTART:20240909T080000\r\nDTEND:20240909T094000'))
    const start = new Date(result.events[0]?.start ?? 0)
    expect(start.getHours()).toBe(8)
    expect(start.getMinutes()).toBe(0)
  })

  it('缺少 DTEND 时默认 1 小时', () => {
    const result = parseIcs(wrap('UID:1\r\nSUMMARY:讲座\r\nDTSTART:20240909T100000Z'))
    const event = result.events[0]
    expect((event?.end ?? 0) - (event?.start ?? 0)).toBe(3_600_000)
  })

  it('全天日程按整天处理', () => {
    const result = parseIcs(wrap('UID:1\r\nSUMMARY:校运会\r\nDTSTART;VALUE=DATE:20240910\r\nDTEND;VALUE=DATE:20240911'))
    const event = result.events[0]
    expect(event?.allDay).toBe(true)
    expect(new Date(event?.start ?? 0).getHours()).toBe(0)
    expect((event?.end ?? 0) - (event?.start ?? 0)).toBe(86_400_000)
  })
})

describe('parseIcs 重复日程', () => {
  const weekly = 'UID:1\r\nSUMMARY:高等数学\r\nDTSTART:20240909T080000Z\r\nDTEND:20240909T094000Z'

  it('按 COUNT 展开每周日程', () => {
    const result = parseIcs(wrap(`${weekly}\r\nRRULE:FREQ=WEEKLY;COUNT=3`))
    const first = new Date(result.events[0]?.start ?? 0)
    const expected = [0, 7, 14].map((offset) => toDateKey(addDays(first, offset)))
    expect(result.events.map((event) => toDateKey(event.start))).toEqual(expected)
    // 每次保持相同的本地时间
    expect(new Set(result.events.map((event) => new Date(event.start).getHours())).size).toBe(1)
  })

  it('支持 BYDAY 多个星期', () => {
    const result = parseIcs(wrap(`${weekly}\r\nRRULE:FREQ=WEEKLY;BYDAY=MO,WE;COUNT=4`))
    expect(result.events.map((event) => new Date(event.start).getDay())).toEqual([1, 3, 1, 3])
  })

  it('INTERVAL=2 隔周上课', () => {
    const result = parseIcs(wrap(`${weekly}\r\nRRULE:FREQ=WEEKLY;INTERVAL=2;COUNT=3`))
    const first = new Date(result.events[0]?.start ?? 0)
    const expected = [0, 14, 28].map((offset) => toDateKey(addDays(first, offset)))
    expect(result.events.map((event) => toDateKey(event.start))).toEqual(expected)
  })

  it('UNTIL 之后不再展开', () => {
    const result = parseIcs(wrap(`${weekly}\r\nRRULE:FREQ=WEEKLY;UNTIL=20240917T000000Z`))
    expect(result.events).toHaveLength(2)
  })

  it('EXDATE 排除指定日期', () => {
    const result = parseIcs(
      wrap(`${weekly}\r\nRRULE:FREQ=WEEKLY;COUNT=3\r\nEXDATE:20240916T080000Z`),
    )
    const first = new Date(result.events[0]?.start ?? 0)
    expect(result.events).toHaveLength(2)
    // 第二次应跳过被排除的那一周，落在两周后
    expect(toDateKey(result.events[1]?.start ?? 0)).toBe(toDateKey(addDays(first, 14)))
  })

  it('不支持的频率保留单次并给出警告', () => {
    const result = parseIcs(wrap(`${weekly}\r\nRRULE:FREQ=MONTHLY;COUNT=3`))
    expect(result.events).toHaveLength(1)
    expect(result.warnings.join('')).toMatch(/FREQ=WEEKLY/)
  })
})

describe('parseIcs 文本处理', () => {
  it('展开折行并还原转义字符', () => {
    const folded = wrap(
      'UID:1\r\nSUMMARY:非常长的课程名称\r\n 续行部分\r\nDTSTART:20240909T080000Z\r\nDTEND:20240909T094000Z\r\nDESCRIPTION:教师\\, 张教授\\; 备注',
    )
    const result = parseIcs(folded)
    expect(result.events[0]?.summary).toBe('非常长的课程名称续行部分')
    expect(result.events[0]?.description).toBe('教师, 张教授; 备注')
  })

  it('忽略 VALARM 等嵌套组件', () => {
    const result = parseIcs(
      wrap(
        'UID:1\r\nSUMMARY:讲座\r\nDTSTART:20240909T080000Z\r\nDTEND:20240909T094000Z\r\nBEGIN:VALARM\r\nTRIGGER:-PT15M\r\nACTION:DISPLAY\r\nEND:VALARM',
      ),
    )
    expect(result.events).toHaveLength(1)
    expect(result.events[0]?.summary).toBe('讲座')
  })

  it('非 ICS 内容抛出 IcsFormatError', () => {
    expect(() => parseIcs('not a calendar')).toThrow(IcsFormatError)
  })

  it('没有 VEVENT 时给出警告', () => {
    const result = parseIcs('BEGIN:VCALENDAR\r\nVERSION:2.0\r\nEND:VCALENDAR')
    expect(result.events).toHaveLength(0)
    expect(result.warnings.join('')).toMatch(/没有找到可导入的日程/)
  })
})

describe('icsToCourses 映射', () => {
  it('提取课程名、教师、教室并去掉校区前缀', () => {
    const result = icsToCourses(
      wrap(
        'UID:1\r\nSUMMARY:数据结构\r\nLOCATION:[主校区] 教学楼B203\r\nDESCRIPTION:授课教师: 李老师\\n周次: 1-16\r\nDTSTART:20240909T080000Z\r\nDTEND:20240909T094000Z',
      ),
    )

    expect(result.courses[0]).toMatchObject({
      lessonName: '数据结构',
      teacherName: '李老师',
      classRoomName: '教学楼B203',
    })
    expect(result.courses[0]?.description).toContain('周次')
    expect(result.list).toHaveLength(result.courses.length)
  })

  it('缺少教师或教室时使用占位符', () => {
    const result = icsToCourses(wrap('UID:1\r\nSUMMARY:自习\r\nDTSTART:20240909T080000Z\r\nDTEND:20240909T094000Z'))
    expect(result.courses[0]).toMatchObject({ teacherName: '未知教师', classRoomName: '未知地点' })
  })

  it('没有日程时抛出 IcsFormatError', () => {
    expect(() => icsToCourses('BEGIN:VCALENDAR\r\nVERSION:2.0\r\nEND:VCALENDAR')).toThrow(
      /没有解析到日程/,
    )
  })

  it('extractTeacher / stripCampusPrefix 处理边界情况', () => {
    expect(extractTeacher('老师：王老师\n其他')).toBe('王老师')
    expect(extractTeacher('teacher: Smith')).toBe('Smith')
    expect(extractTeacher('无教师信息')).toBeNull()
    expect(stripCampusPrefix('  [东校区] 实验楼 401')).toBe('实验楼 401')
    expect(stripCampusPrefix('实验楼 401')).toBe('实验楼 401')
  })
})
