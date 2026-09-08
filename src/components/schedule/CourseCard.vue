<script setup lang="ts">
import { computed } from 'vue'

import {
  courseStatus,
  formatDuration,
  formatTime,
  isToday,
  toLocalDateTimeValue,
  type Course,
} from '@/domain'
import { useNow } from '@/composables/useNow'

const props = defineProps<{
  course: Course
  /** 用于入场动画的错峰延迟。 */
  index: number
}>()

const emit = defineEmits<{ select: [course: Course] }>()

const now = useNow()

/**
 * 状态标签只在「今天」显示，避免历史日期堆满标签。
 */
const status = computed(() => {
  if (!isToday(props.course.startTime, now.value)) return null
  const value = courseStatus(props.course, now.value)
  return {
    value,
    label: value === 'current' ? '进行中' : value === 'upcoming' ? '即将开始' : '已结束',
  }
})

const startLabel = computed(() => formatTime(props.course.startTime))
const endLabel = computed(() => formatTime(props.course.endTime))
const durationLabel = computed(() =>
  formatDuration((props.course.endTime - props.course.startTime) / 60_000),
)
</script>

<template>
  <li class="course" :data-status="status?.value">
    <article
      class="course-card"
      :style="{ '--i': index, '--course-color': course.tagcolour }"
      @click="emit('select', course)"
    >
      <div class="course-time">
        <time class="t-start" :datetime="toLocalDateTimeValue(course.startTime)">{{ startLabel }}</time>
        <time class="t-end" :datetime="toLocalDateTimeValue(course.endTime)">{{ endLabel }}</time>
        <span class="t-duration">{{ durationLabel }}</span>
      </div>

      <div class="course-body">
        <div class="course-titlerow">
          <h3 class="course-title">
            <button type="button" class="course-open" @click.stop="emit('select', course)">
              {{ course.lessonName }}
            </button>
          </h3>
          <p v-if="status" class="course-status" :data-status="status.value">
            <span v-if="status.value === 'current'" class="status-pulse" aria-hidden="true" />
            {{ status.label }}
          </p>
        </div>

        <dl class="course-meta">
          <div>
            <dt>教师</dt>
            <dd>{{ course.teacherName }}</dd>
          </div>
          <div>
            <dt>地点</dt>
            <dd>{{ course.classRoomName }}</dd>
          </div>
        </dl>
      </div>
    </article>
  </li>
</template>

<style scoped>
.course-card {
    position: relative;
    display: grid;
    grid-template-columns: 4.5rem minmax(0, 1fr);
    column-gap: var(--space-6);
    padding: 1.15rem 0.75rem;
    margin-inline: -0.75rem;
    border-top: 1px solid var(--line);
    border-radius: var(--radius);
    cursor: pointer;
    animation: rise 0.42s var(--ease) both;
    animation-delay: calc(var(--i, 0) * 36ms);
    transition: background var(--dur) var(--ease);
}

.course-card:hover,
.course-card:focus-within {
    background: var(--surface-2);
}

.course-card:active {
    background: var(--surface-2);
}

.course-time {
    display: flex;
    flex-direction: column;
    padding-top: 0.15rem;
    font-family: var(--font-mono);
    font-size: var(--text-sm);
    line-height: var(--leading-snug);
    font-variant-numeric: tabular-nums;
    color: var(--ink-2);
}

.course-time .t-start {
    font-weight: 700;
}

.course-time .t-end {
    color: var(--ink-3);
}

.t-duration {
    margin-top: 0.15rem;
    color: var(--ink-3);
    font-size: var(--text-2xs);
}

.course-body {
    position: relative;
    min-width: 0;
}

/* 时间轴：发丝竖线 + 课程色节点 */
.course-body::before {
    content: '';
    position: absolute;
    left: -0.75rem;
    top: 0.4rem;
    bottom: -1.15rem;
    width: 1px;
    background: var(--line);
}

.course-body::after {
    content: '';
    position: absolute;
    left: calc(-0.75rem - 3px);
    top: 0.45rem;
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: var(--course-color, var(--accent));
    box-shadow: 0 0 0 3px var(--canvas);
    transition: transform var(--dur) var(--ease);
}

.course-card:hover .course-body::after {
    transform: scale(1.18);
}

.course:last-child .course-body::before {
    bottom: 0.4rem;
}

.course-titlerow {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: var(--space-4);
}

.course-title {
    font-size: var(--text-lg);
    font-weight: 600;
    line-height: var(--leading-snug);
    text-wrap: pretty;
}

.course-open {
    padding: 0;
    border: 0;
    background: none;
    font: inherit;
    color: inherit;
    text-align: left;
    cursor: pointer;
    text-underline-offset: 0.22em;
    text-decoration-thickness: 1px;
}

.course-card:hover .course-open {
    text-decoration: underline;
    color: var(--accent);
}

.course-status {
    flex: none;
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.15rem 0.55rem;
    border-radius: 999px;
    font-size: var(--text-xs);
    font-weight: 600;
    white-space: nowrap;
}

.status-pulse {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: currentColor;
    animation: pulse-live 1.8s var(--ease-in-out) infinite;
}

.course-status[data-status='current'] {
    background: var(--live-soft);
    color: var(--live);
}

.course-status[data-status='upcoming'] {
    background: var(--soon-soft);
    color: var(--soon);
}

.course-status[data-status='past'] {
    background: var(--surface-2);
    color: var(--ink-3);
}

.course-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 0.3rem var(--space-6);
    margin-top: 0.5rem;
}

.course-meta > div {
    display: flex;
    align-items: baseline;
    gap: 0.4rem;
    min-width: 0;
}

.course-meta dt {
    color: var(--ink-3);
    font-size: var(--text-xs);
}

.course-meta dd {
    margin: 0;
    color: var(--ink-2);
    font-size: var(--text-base);
    overflow-wrap: anywhere;
}

@media (max-width: 44rem) {
    .course-card {
        grid-template-columns: 3.5rem minmax(0, 1fr);
        column-gap: 1.1rem;
        padding: 1rem 0.6rem;
        margin-inline: -0.6rem;
    }

    .course-body::before {
        left: -0.55rem;
    }

    .course-body::after {
        left: calc(-0.55rem - 3px);
    }

    .course-time {
        font-size: var(--text-xs);
    }

    .course-titlerow {
        flex-direction: column;
        align-items: flex-start;
        gap: 0.4rem;
    }
}
</style>
