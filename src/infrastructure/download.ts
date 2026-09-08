/** 触发浏览器下载（Blob + 隐藏 <a>）。 */

const CALENDAR_MIME = 'text/calendar;charset=utf-8'
const JSON_MIME = 'application/json;charset=utf-8'

function triggerDownload(filename: string, text: string, mime: string): void {
  const url = URL.createObjectURL(new Blob([text], { type: mime }))
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.rel = 'noopener'
  document.body.appendChild(link)
  link.click()
  link.remove()
  // 交给浏览器读取 Blob 之后再回收
  setTimeout(() => URL.revokeObjectURL(url), 1_000)
}

/** 下载 ICS 日历。 */
export function downloadIcs(filename: string, content: string): void {
  triggerDownload(filename, content, CALENDAR_MIME)
}

/** 下载 JSON 课程数据。 */
export function downloadJson(filename: string, content: string): void {
  triggerDownload(filename, content, JSON_MIME)
}

/** 读取用户选择的文本文件。 */
export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = () => reject(new Error('文件读取失败'))
    reader.readAsText(file)
  })
}
