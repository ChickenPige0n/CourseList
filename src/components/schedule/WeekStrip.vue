<script setup lang="ts">
import { computed, nextTick, ref, type ComponentPublicInstance } from 'vue'

import { formatFullDate } from '@/domain'
import { useScheduleStore, type WeekDay } from '@/stores/schedule'
import { useSwipe } from '@/composables/useSwipe'

const schedule = useScheduleStore()
const weekDaysEl = ref<HTMLElement | null>(null)
const dayButtons = ref<(HTMLButtonElement | null)[]>([])

useSwipe(weekDaysEl, {
  threshold: 50,
  onSwipeLeft: () => schedule.shiftWeek(1),
  onSwipeRight: () => schedule.shiftWeek(-1),
})

const metaLabel = computed(
  () => `${schedule.weekContainsToday ? '本周 · ' : ''}${schedule.weekCount} 门课程`,
)

function dayLabel(day: WeekDay): string {
  const count = day.count > 0 ? `${day.count} 门课程` : '没有课程'
  return `${formatFullDate(day.date)}，${count}`
}

function setDayRef(el: Element | ComponentPublicInstance | null, index: number): void {
  dayButtons.value[index] = el instanceof HTMLButtonElement ? el : null
}

/** 方向键在周内移动选中日期，上下键整周切换。 */
function onDayKeydown(event: KeyboardEvent, index: number): void {
  const days = schedule.weekDays
  let target = index

  switch (event.key) {
    case 'ArrowRight':
      target = Math.min(index + 1, days.length - 1)
      break
    case 'ArrowLeft':
      target = Math.max(index - 1, 0)
      break
    case 'Home':
      target = 0
      break
    case 'End':
      target = days.length - 1
      break
    case 'ArrowUp':
    case 'ArrowDown':
      event.preventDefault()
      schedule.shiftWeek(event.key === 'ArrowUp' ? -1 : 1)
      void nextTick(() => dayButtons.value[index]?.focus())
      return
    default:
      return
  }

  if (target === index) return
  event.preventDefault()
  const day = days[target]
  if (day) schedule.select(day.date)
  void nextTick(() => dayButtons.value[target]?.focus())
}
</script>

<template>
  <section class="week" aria-labelledby="weekTitle">
    <div class="section-head">
      <h2 id="weekTitle" class="week-range">{{ schedule.weekLabel }}</h2>
      <p class="week-meta">{{ metaLabel }}</p>
    </div>

    <ol ref="weekDaysEl" class="week-days">
      <li v-for="(day, index) in schedule.weekDays" :key="day.dateKey">
        <button
          :ref="(el) => setDayRef(el, index)"
          type="button"
          class="week-day"
          :style="{ '--i': index }"
          :aria-current="day.isSelected ? 'date' : undefined"
          :data-today="day.isToday ? 'true' : undefined"
          :aria-label="dayLabel(day)"
          @click="schedule.select(day.date)"
          @keydown="onDayKeydown($event, index)"
        >
          <span class="week-day-name">{{ day.label }}</span>
          <span class="week-day-date">{{ day.dayOfMonth }}</span>
          <span class="week-day-dots" aria-hidden="true">
            <i v-for="dot in Math.min(day.count, 4)" :key="dot" />
          </span>
        </button>
      </li>
    </ol>
  </section>
</template>

<style scoped>
.week {
    margin-bottom: var(--space-12);
}

.section-head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: var(--space-4);
    flex-wrap: wrap;
    margin-bottom: var(--space-3);
}

.week-range {
    font-size: var(--text-base);
    font-weight: 600;
    letter-spacing: var(--tracking-normal);
    font-variant-numeric: tabular-nums;
}

.week-meta {
    color: var(--ink-3);
    font-size: var(--text-sm);
    font-variant-numeric: tabular-nums;
}

.week-days {
    display: grid;
    grid-template-columns: repeat(7, minmax(0, 1fr));
    border-block: 1px solid var(--line);
}

.week-days > li + li {
    border-left: 1px solid var(--line);
}

.week-day {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.3rem;
    width: 100%;
    padding: var(--space-4) 0.4rem 0.9rem;
    border: 0;
    border-radius: var(--radius-sm);
    background: transparent;
    cursor: pointer;
    animation: rise 0.42s var(--ease) both;
    animation-delay: calc(var(--i, 0) * 30ms);
    transition: background var(--dur) var(--ease), color var(--dur) var(--ease);
}

.week-day:hover {
    background: var(--surface-2);
}

.week-day:active {
    background: var(--line);
}

.week-day-name {
    color: var(--ink-3);
    font-size: var(--text-2xs);
    font-weight: 500;
    letter-spacing: var(--tracking-wide);
    line-height: var(--leading-tight);
}

.week-day-date {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    font-size: var(--text-2xl);
    font-weight: 600;
    line-height: 1.05;
    font-variant-numeric: tabular-nums;
}

/* 今天：星期标签转为朱砂，日期旁一枚朱砂点 */
.week-day[data-today='true'] .week-day-name {
    color: var(--accent);
}

.week-day[data-today='true'] .week-day-date::after {
    content: '';
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: var(--accent);
}

.week-day-dots {
    display: flex;
    gap: 3px;
    height: 5px;
}

.week-day-dots i {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: var(--accent);
    animation: rise 0.3s var(--ease) both;
}

/* 选中：墨色实块 */
.week-day[aria-current='date'] {
    background: var(--ink);
    color: var(--canvas);
}

.week-day[aria-current='date']:hover,
.week-day[aria-current='date']:active {
    background: var(--ink);
}

.week-day[aria-current='date'] .week-day-name {
    color: var(--canvas);
    opacity: 0.72;
}

.week-day[aria-current='date'] .week-day-dots i {
    background: var(--canvas);
    opacity: 0.75;
}

.week-day[aria-current='date'] .week-day-date::after {
    background: var(--canvas);
}

@media (max-width: 44rem) {
    .week {
        margin-bottom: var(--space-8);
    }

    .week-day {
        padding: 0.75rem 0.15rem 0.65rem;
        gap: 0.2rem;
    }

    .week-day-date {
        font-size: var(--text-xl);
    }

    .week-day-name {
        font-size: var(--text-2xs);
        letter-spacing: 0.02em;
    }
}

@media (max-width: 26rem) {
    .week-day-date {
        font-size: var(--text-lg);
    }
}
</style>
