import { getCurrentInstance, onMounted, onScopeDispose, ref, type Ref } from 'vue'

const TICK_INTERVAL = 30_000

const now = ref(Date.now())
let timer: number | undefined
let subscribers = 0

function start(): void {
  if (timer !== undefined) return
  timer = window.setInterval(() => {
    now.value = Date.now()
  }, TICK_INTERVAL)
}

function stop(): void {
  if (timer === undefined) return
  window.clearInterval(timer)
  timer = undefined
}

/**
 * 共享的「当前时间」信号，用于课程状态（进行中 / 即将开始 / 已结束）
 * 自动刷新。多个组件共用同一个定时器。
 */
export function useNow(): Ref<number> {
  if (getCurrentInstance()) {
    onMounted(() => {
      subscribers += 1
      start()
    })
    onScopeDispose(() => {
      subscribers -= 1
      if (subscribers <= 0) stop()
    })
  }
  return now
}
