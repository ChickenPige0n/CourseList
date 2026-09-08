import { describe, expect, it } from 'vitest'

import { detectFormat, importCourseText } from '@/domain/importer'

const JSON_TEXT = JSON.stringify({
  data: {
    list: [
      {
        lessonName: '高等数学',
        teacherName: '张教授',
        classRoomName: '教学楼A101',
        startTime: new Date(2024, 8, 9, 8, 0).getTime(),
        endTime: new Date(2024, 8, 9, 9, 40).getTime(),
      },
    ],
  },
})

const ICS_TEXT = [
  'BEGIN:VCALENDAR',
  'VERSION:2.0',
  'BEGIN:VEVENT',
  'UID:1',
  'SUMMARY:大学英语',
  'LOCATION:外语楼B202',
  'DESCRIPTION:授课教师: 李老师',
  'DTSTART:20240910T100000Z',
  'DTEND:20240910T114000Z',
  'END:VEVENT',
  'END:VCALENDAR',
].join('\r\n')

describe('detectFormat', () => {
  it('按首行区分 ICS 与 JSON', () => {
    expect(detectFormat(ICS_TEXT)).toBe('ics')
    expect(detectFormat(JSON_TEXT)).toBe('json')
    expect(detectFormat('  \uFEFFBEGIN:VCALENDAR')).toBe('ics')
  })
})

describe('importCourseText', () => {
  it('导入 JSON 并输出规范化文本', () => {
    const result = importCourseText(JSON_TEXT)
    expect(result.format).toBe('json')
    expect(result.courses).toHaveLength(1)
    expect(JSON.parse(result.jsonText).data.list[0].lessonName).toBe('高等数学')
  })

  it('导入 ICS 并携带日历名', () => {
    const result = importCourseText(ICS_TEXT)
    expect(result.format).toBe('ics')
    expect(result.courses[0]).toMatchObject({
      lessonName: '大学英语',
      teacherName: '李老师',
      classRoomName: '外语楼B202',
    })
  })

  it('无法解析时抛出可读错误', () => {
    expect(() => importCourseText('{ oops')).toThrow(/JSON 语法错误/)
    expect(() => importCourseText('BEGIN:VCALENDAR\r\nEND:VCALENDAR')).toThrow(/没有解析到日程/)
  })
})
