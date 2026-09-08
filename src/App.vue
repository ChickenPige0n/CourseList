<script setup lang="ts">
import { onMounted, ref } from 'vue'

import type { Course } from '@/domain'
import { useBusy } from '@/composables/useBusy'
import { useCourseTransfer } from '@/composables/useCourseTransfer'
import { useKeyboardShortcuts } from '@/composables/useKeyboardShortcuts'
import { useTheme } from '@/composables/useTheme'
import { useCourseStore } from '@/stores/courses'
import AppFooter from '@/components/layout/AppFooter.vue'
import AppHeader from '@/components/layout/AppHeader.vue'
import DataDialog from '@/components/data/DataDialog.vue'
import CourseDetailDialog from '@/components/schedule/CourseDetailDialog.vue'
import DaySchedule from '@/components/schedule/DaySchedule.vue'
import WeekStrip from '@/components/schedule/WeekStrip.vue'
import LoadingOverlay from '@/ui/LoadingOverlay.vue'
import ToastHost from '@/ui/ToastHost.vue'

useTheme()
useKeyboardShortcuts()

const courseStore = useCourseStore()
const transfer = useCourseTransfer()
const { busy } = useBusy()

const dataDialogOpen = ref(false)
const detailDialogOpen = ref(false)
const selectedCourse = ref<Course | null>(null)

onMounted(() => courseStore.loadFromStorage())

function openCourseDetail(course: Course): void {
  selectedCourse.value = course
  detailDialogOpen.value = true
}

function closeCourseDetail(): void {
  detailDialogOpen.value = false
  selectedCourse.value = null
}

function exportCourse(course: Course): void {
  transfer.exportCourseIcs(course)
  closeCourseDetail()
}
</script>

<template>
  <a class="skip-link" href="#main">跳到课程列表</a>

  <AppHeader @open-data="dataDialogOpen = true" />

  <main id="main" class="wrap">
    <WeekStrip />
    <DaySchedule @open-data="dataDialogOpen = true" @select="openCourseDetail" />
  </main>

  <AppFooter />

  <DataDialog :open="dataDialogOpen" @close="dataDialogOpen = false" />
  <CourseDetailDialog
    :open="detailDialogOpen"
    :course="selectedCourse"
    @close="closeCourseDetail"
    @export="exportCourse"
  />

  <LoadingOverlay :active="busy" />
  <ToastHost />
</template>

<style scoped>
main {
    padding-top: var(--space-10);
}

@media (max-width: 44rem) {
    main {
        padding-top: var(--space-6);
    }
}
</style>
