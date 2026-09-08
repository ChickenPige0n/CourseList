import { useCourseStore } from '@/stores/courses'
import { useToast } from '@/composables/useToast'
import { downloadIcs, downloadJson, readFileAsText } from '@/infrastructure/download'
import {
  buildCourseCalendar,
  calendarFileName,
  icsFileName,
  importCourseText,
  type Course,
  type CourseImportResult,
} from '@/domain'

export interface TransferSuccess {
  readonly ok: true
  readonly count: number
  /** 规范化后的 JSON 文本，可直接回填到编辑器。 */
  readonly jsonText: string
  readonly warnings: readonly string[]
}

export interface TransferFailure {
  readonly ok: false
  readonly message: string
}

export type TransferResult = TransferSuccess | TransferFailure

type ParseOutcome =
  | { readonly ok: true; readonly result: CourseImportResult }
  | { readonly ok: false; readonly message: string }

/**
 * 课程数据的「进出」用例：解析用户提供的文本 / 文件，
 * 以及把当前数据导出为 ICS / JSON。
 *
 * 组件只负责展示结果，不再重复编写 try/catch 与提示文案。
 */
export function useCourseTransfer() {
  const store = useCourseStore()
  const toast = useToast()

  function parse(text: string): ParseOutcome {
    if (text.trim() === '') return { ok: false, message: '请先输入或选择课程数据' }
    try {
      return { ok: true, result: importCourseText(text) }
    } catch (error) {
      return { ok: false, message: error instanceof Error ? error.message : '数据无法解析' }
    }
  }

  function reportWarnings(warnings: readonly string[]): void {
    if (warnings.length === 0) return
    const [first, ...rest] = warnings
    toast.warning(rest.length > 0 ? `${first}（另有 ${rest.length} 条提示）` : (first as string))
  }

  function toSuccess(result: CourseImportResult): TransferSuccess {
    return {
      ok: true,
      count: result.courses.length,
      jsonText: result.jsonText,
      warnings: result.warnings,
    }
  }

  /** 解析文本，但不改变当前数据（供「验证格式」使用）。 */
  function convert(text: string): TransferResult {
    const parsed = parse(text)
    if (!parsed.ok) {
      toast.error(parsed.message)
      return parsed
    }

    const { result } = parsed
    const label = result.format === 'ics' ? 'ICS' : 'JSON'
    toast.success(`已解析 ${label}：${result.courses.length} 门课程`)
    reportWarnings(result.warnings)
    return toSuccess(result)
  }

  /** 读取并解析用户选择的文件。 */
  async function convertFile(file: File): Promise<TransferResult> {
    try {
      return convert(await readFileAsText(file))
    } catch (error) {
      const message = error instanceof Error ? error.message : '文件读取失败'
      toast.error(message)
      return { ok: false, message }
    }
  }

  /** 解析文本并应用（写入本地存储 + 刷新界面）。 */
  function apply(text: string): TransferResult {
    const parsed = parse(text)
    if (!parsed.ok) {
      toast.error(parsed.message)
      return parsed
    }

    const { result } = parsed
    const persisted = store.replaceAll(result.courses)
    if (persisted) {
      toast.success(`课程数据已保存并应用（${result.courses.length} 门课程）`)
    } else {
      toast.warning('课程已载入，但本地存储写入失败（可能是隐私模式或空间不足）')
    }
    reportWarnings(result.warnings)
    return toSuccess(result)
  }

  /** 导出全部课程为 ICS 日历。 */
  function exportAllIcs(): void {
    if (!store.hasData) {
      toast.warning('还没有可导出的课程数据')
      return
    }
    downloadIcs(calendarFileName(), store.toIcs())
    toast.success(`已导出 ${store.count} 门课程为 ICS`)
  }

  /** 导出单门课程为 ICS。 */
  function exportCourseIcs(course: Course): void {
    downloadIcs(icsFileName(course), buildCourseCalendar(course))
    toast.success(`已导出课程：${course.lessonName}`)
  }

  /** 导出当前数据为 JSON。 */
  function exportJson(): void {
    if (!store.hasData) {
      toast.warning('还没有可导出的课程数据')
      return
    }
    downloadJson('SUAT课程表.json', store.toJson())
    toast.success('已导出 JSON 数据')
  }

  /** 清空全部课程数据。 */
  function clearAll(): void {
    store.clear()
    toast.success('课程数据已清除')
  }

  return { convert, convertFile, apply, exportAllIcs, exportCourseIcs, exportJson, clearAll }
}
