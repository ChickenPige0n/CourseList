<script setup lang="ts">
import { computed } from 'vue'

import { formatFullDate, formatTime, toLocalDateTimeValue, type Course } from '@/domain'
import AppIcon from '@/ui/AppIcon.vue'
import BaseButton from '@/ui/BaseButton.vue'
import BaseDialog from '@/ui/BaseDialog.vue'

const props = defineProps<{
  open: boolean
  course: Course | null
}>()

const emit = defineEmits<{ close: []; export: [course: Course] }>()

const title = computed(() => props.course?.lessonName ?? '课程详情')
const dateLabel = computed(() => (props.course ? formatFullDate(props.course.startTime) : ''))
const startLabel = computed(() => (props.course ? formatTime(props.course.startTime) : ''))
const endLabel = computed(() => (props.course ? formatTime(props.course.endTime) : ''))

function exportCurrent(): void {
  if (props.course) emit('export', props.course)
}
</script>

<template>
  <BaseDialog :open="open" :title="title" size="sm" @close="emit('close')">
    <dl v-if="course" class="detail-list">
      <div>
        <dt><AppIcon name="clock" size="0.9rem" />日期时间</dt>
        <dd>
          {{ dateLabel }}<br>
          <time :datetime="toLocalDateTimeValue(course.startTime)">{{ startLabel }}</time>
          –
          <time :datetime="toLocalDateTimeValue(course.endTime)">{{ endLabel }}</time>
        </dd>
      </div>

      <div>
        <dt><AppIcon name="user" size="0.9rem" />授课教师</dt>
        <dd>{{ course.teacherName }}</dd>
      </div>

      <div>
        <dt><AppIcon name="map-pin" size="0.9rem" />上课地点</dt>
        <dd>{{ course.classRoomName }}</dd>
      </div>

      <div v-if="course.description">
        <dt><AppIcon name="file-text" size="0.9rem" />课程描述</dt>
        <dd class="detail-description">{{ course.description }}</dd>
      </div>
    </dl>

    <template #footer>
      <BaseButton variant="primary" :disabled="!course" @click="exportCurrent">
        <AppIcon name="download" size="1rem" />
        <span>导出为 ICS</span>
      </BaseButton>
    </template>
  </BaseDialog>
</template>

<style scoped>
.detail-list {
    display: grid;
    gap: var(--space-5);
}

.detail-list > div {
    display: grid;
    gap: 0.15rem;
}

.detail-list dt {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    color: var(--ink-3);
    font-size: var(--text-xs);
    letter-spacing: var(--tracking-wide);
    text-transform: uppercase;
}

.detail-list dd {
    margin: 0;
    color: var(--ink-2);
    font-size: var(--text-md);
    overflow-wrap: anywhere;
    text-wrap: pretty;
}

.detail-list time {
    font-variant-numeric: tabular-nums;
}

.detail-description {
    white-space: pre-wrap;
}
</style>
