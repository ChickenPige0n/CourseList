<script setup lang="ts">
import { computed, ref } from 'vue'

import {
  formatDuration,
  formatMonthDay,
  formatRelativeDay,
  formatTime,
  WEEKDAY_SHORT,
  type Course,
} from '@/domain'
import { useCourseStore } from '@/stores/courses'
import { useScheduleStore } from '@/stores/schedule'
import { useSwipe } from '@/composables/useSwipe'
import AppIcon from '@/ui/AppIcon.vue'
import BaseButton from '@/ui/BaseButton.vue'
import EmptyState from '@/ui/EmptyState.vue'
import CourseCard from '@/components/schedule/CourseCard.vue'

const emit = defineEmits<{ openData: []; select: [course: Course] }>()

const courseStore = useCourseStore()
const schedule = useScheduleStore()

const listEl = ref<HTMLElement | null>(null)
useSwipe(listEl, {
  threshold: 80,
  onSwipeLeft: () => schedule.shiftDay(1),
  onSwipeRight: () => schedule.shiftDay(-1),
})

const weekdayLabel = computed(() => WEEKDAY_SHORT[schedule.selectedDate.getDay()] as string)
const relativeLabel = computed(() => formatRelativeDay(schedule.selectedDate))
const titleMain = computed(() => relativeLabel.value ?? formatMonthDay(schedule.selectedDate))
const titleSub = computed(() =>
  relativeLabel.value
    ? `${formatMonthDay(schedule.selectedDate)} ${weekdayLabel.value}`
    : weekdayLabel.value,
)

const dayMetaLabel = computed(() => {
  const { count, firstStart, lastEnd, minutes } = schedule.daySummary
  if (count === 0 || firstStart === null || lastEnd === null) return ''
  return `${count} 门课程 · ${formatTime(firstStart)} – ${formatTime(lastEnd)} · 共 ${formatDuration(minutes)}`
})

const emptyTitle = computed(() => (schedule.isTodaySelected ? '今天没有课程' : '这天没有课程'))
const emptyText = computed(() =>
  courseStore.hasData
    ? '换一天看看，或回到今天。'
    : '导入教务系统导出的 ICS 课表，或粘贴 JSON 数据后即可查看。',
)

const listKey = computed(() => schedule.selectedDate.toDateString())
</script>

<template>
  <section class="day" aria-labelledby="dayTitle">
    <div class="section-head">
      <h2 id="dayTitle" class="day-title">
        <span class="day-title-main">{{ titleMain }}</span>
        <span class="day-title-sub">{{ titleSub }}</span>
      </h2>
      <p v-if="dayMetaLabel" class="day-meta">{{ dayMetaLabel }}</p>
    </div>

    <Transition name="day" mode="out-in">
      <ol v-if="schedule.selectedCourses.length > 0" :key="listKey" ref="listEl" class="course-list">
        <CourseCard
          v-for="(course, index) in schedule.selectedCourses"
          :key="course.id"
          :course="course"
          :index="index"
          @select="emit('select', $event)"
        />
      </ol>

      <EmptyState v-else :key="listKey" :title="emptyTitle" :text="emptyText">
        <template #icon>
          <AppIcon name="calendar-x" size="1.75rem" />
        </template>
        <template v-if="!courseStore.hasData" #actions>
          <BaseButton variant="primary" @click="emit('openData')">导入课表</BaseButton>
        </template>
      </EmptyState>
    </Transition>
  </section>
</template>

<style scoped>
.section-head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: var(--space-4);
    flex-wrap: wrap;
    margin-bottom: var(--space-2);
}

.day-title {
    display: flex;
    align-items: baseline;
    gap: 0.6rem;
    flex-wrap: wrap;
}

.day-title-main {
    font-size: var(--text-3xl);
    font-weight: 600;
    letter-spacing: var(--tracking-tight);
    font-variant-numeric: tabular-nums;
}

.day-title-sub {
    color: var(--ink-3);
    font-size: var(--text-base);
    font-weight: 500;
    letter-spacing: var(--tracking-normal);
    font-variant-numeric: tabular-nums;
}

.day-meta {
    color: var(--ink-3);
    font-size: var(--text-sm);
    font-variant-numeric: tabular-nums;
}

.course-list {
    margin-top: var(--space-1);
}

/* 切换日期时列表淡入淡出 */
.day-enter-active {
    transition: opacity var(--dur) var(--ease), transform var(--dur) var(--ease);
}

.day-leave-active {
    transition: opacity var(--dur-fast) var(--ease-in-out), transform var(--dur-fast) var(--ease-in-out);
}

.day-enter-from {
    opacity: 0;
    transform: translateY(8px);
}

.day-leave-to {
    opacity: 0;
    transform: translateY(-4px);
}

@media (max-width: 44rem) {
    .day-title-main {
        font-size: var(--text-2xl);
    }
}
</style>
